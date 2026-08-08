import cookieParser from 'cookie-parser';
import express from 'express';
import { z } from 'zod';
import { login, logout, requireAuth, session } from './auth.js';
import { pool, withTransaction } from './db.js';
import { paginate, parsePagination } from './pagination.js';
import { computeLeaderboard } from './trueskill.js';

const app = express();
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

const asyncHandler = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  req.body = result.data;
  next();
};

const nameSchema = z.object({ name: z.string().trim().min(1) });

const matchSchema = z.object({
  played_at: z.string().min(1),
  outcome: z.enum(['team1_win', 'team2_win', 'draw']),
  // player ids come back from Postgres as strings (bigint) and round-trip through
  // the frontend as strings too, so coerce rather than require a JS number.
  team1_player_ids: z.array(z.coerce.number().int()).min(1),
  team2_player_ids: z.array(z.coerce.number().int()).min(1),
});

function rosterError(body) {
  const t1 = new Set(body.team1_player_ids);
  const t2 = new Set(body.team2_player_ids);
  if (t1.size !== body.team1_player_ids.length || t2.size !== body.team2_player_ids.length) {
    return 'a player cannot appear twice on the same team';
  }
  for (const id of t1) {
    if (t2.has(id)) return 'a player cannot be on both teams';
  }
  return null;
}

async function insertRoster(client, matchId, team1Ids, team2Ids) {
  const values = [];
  const params = [];
  let i = 1;
  for (const playerId of team1Ids) {
    values.push(`($${i++}, 1, $${i++})`);
    params.push(matchId, playerId);
  }
  for (const playerId of team2Ids) {
    values.push(`($${i++}, 2, $${i++})`);
    params.push(matchId, playerId);
  }
  await client.query(
    `INSERT INTO match_players (match_id, team, player_id) VALUES ${values.join(', ')}`,
    params
  );
}

async function hydrateMatch(match) {
  const { rows } = await pool.query(
    `SELECT mp.team, mp.player_id, p.name
     FROM match_players mp JOIN players p ON p.id = mp.player_id
     WHERE mp.match_id = $1`,
    [match.id]
  );
  const team1 = rows.filter((r) => r.team === 1).map((r) => ({ player_id: r.player_id, name: r.name }));
  const team2 = rows.filter((r) => r.team === 2).map((r) => ({ player_id: r.player_id, name: r.name }));
  return { ...match, team1, team2 };
}

// ---- Public routes (no passcode required) ----

app.post('/api/login', login);
app.post('/api/logout', logout);
app.get('/api/session', session);

app.get(
  '/api/games',
  asyncHandler(async (req, res) => {
    const { page, pageSize, limit, offset } = parsePagination(req);
    const { rows } = await pool.query(
      'SELECT id, name, created_at FROM games ORDER BY name ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM games');
    res.json(paginate(rows, Number(countRows[0].count), page, pageSize));
  })
);

app.get(
  '/api/games/:gameId/leaderboard',
  asyncHandler(async (req, res) => {
    const { page, pageSize, limit, offset } = parsePagination(req);
    const all = await computeLeaderboard(req.params.gameId);
    res.json(paginate(all.slice(offset, offset + limit), all.length, page, pageSize));
  })
);

app.get(
  '/api/games/:gameId/matches',
  asyncHandler(async (req, res) => {
    const { gameId } = req.params;
    const { page, pageSize, limit, offset } = parsePagination(req);

    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM matches WHERE game_id = $1', [gameId]);
    const total = Number(countRows[0].count);

    const { rows: matchRows } = await pool.query(
      'SELECT id, played_at, outcome FROM matches WHERE game_id = $1 ORDER BY played_at DESC, id DESC LIMIT $2 OFFSET $3',
      [gameId, limit, offset]
    );

    if (matchRows.length === 0) {
      return res.json(paginate([], total, page, pageSize));
    }

    const matchIds = matchRows.map((m) => m.id);
    const { rows: playerRows } = await pool.query(
      `SELECT mp.match_id, mp.team, mp.player_id, p.name
       FROM match_players mp JOIN players p ON p.id = mp.player_id
       WHERE mp.match_id = ANY($1)`,
      [matchIds]
    );

    const rosterByMatch = new Map();
    for (const row of playerRows) {
      let roster = rosterByMatch.get(row.match_id);
      if (!roster) {
        roster = { team1: [], team2: [] };
        rosterByMatch.set(row.match_id, roster);
      }
      (row.team === 1 ? roster.team1 : roster.team2).push({ player_id: row.player_id, name: row.name });
    }

    const items = matchRows.map((m) => ({
      id: m.id,
      played_at: m.played_at,
      outcome: m.outcome,
      team1: rosterByMatch.get(m.id)?.team1 ?? [],
      team2: rosterByMatch.get(m.id)?.team2 ?? [],
    }));

    res.json(paginate(items, total, page, pageSize));
  })
);

// ---- Everything below requires the passcode ----

app.use(requireAuth);

app.get(
  '/api/players',
  asyncHandler(async (req, res) => {
    const { page, pageSize, limit, offset } = parsePagination(req);
    const { rows } = await pool.query(
      'SELECT id, name, created_at FROM players ORDER BY name ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM players');
    res.json(paginate(rows, Number(countRows[0].count), page, pageSize));
  })
);

app.post(
  '/api/players',
  validate(nameSchema),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'INSERT INTO players (name) VALUES ($1) RETURNING id, name, created_at',
      [req.body.name]
    );
    res.status(201).json(rows[0]);
  })
);

app.delete(
  '/api/players/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM players WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  })
);

app.post(
  '/api/games',
  validate(nameSchema),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'INSERT INTO games (name) VALUES ($1) RETURNING id, name, created_at',
      [req.body.name]
    );
    res.status(201).json(rows[0]);
  })
);

app.post(
  '/api/games/:gameId/matches',
  validate(matchSchema),
  asyncHandler(async (req, res) => {
    const error = rosterError(req.body);
    if (error) return res.status(400).json({ error });

    const { gameId } = req.params;
    const match = await withTransaction(async (client) => {
      const { rows } = await client.query(
        'INSERT INTO matches (game_id, played_at, outcome) VALUES ($1, $2, $3) RETURNING id, played_at, outcome',
        [gameId, req.body.played_at, req.body.outcome]
      );
      await insertRoster(client, rows[0].id, req.body.team1_player_ids, req.body.team2_player_ids);
      return rows[0];
    });

    res.status(201).json(await hydrateMatch(match));
  })
);

app.put(
  '/api/matches/:id',
  validate(matchSchema),
  asyncHandler(async (req, res) => {
    const error = rosterError(req.body);
    if (error) return res.status(400).json({ error });

    const { id } = req.params;
    const match = await withTransaction(async (client) => {
      const { rows, rowCount } = await client.query(
        'UPDATE matches SET played_at = $1, outcome = $2 WHERE id = $3 RETURNING id, played_at, outcome',
        [req.body.played_at, req.body.outcome, id]
      );
      if (rowCount === 0) return null;
      await client.query('DELETE FROM match_players WHERE match_id = $1', [id]);
      await insertRoster(client, id, req.body.team1_player_ids, req.body.team2_player_ids);
      return rows[0];
    });

    if (!match) return res.status(404).json({ error: 'not found' });
    res.json(await hydrateMatch(match));
  })
);

app.delete(
  '/api/matches/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM matches WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  })
);

// ---- Error handling ----

app.use((err, req, res, next) => {
  if (err?.code === '23505') return res.status(409).json({ error: 'already exists' });
  // 23503 = foreign_key_violation, 23001 = restrict_violation (what ON DELETE RESTRICT raises)
  if (err?.code === '23503' || err?.code === '23001') {
    return res.status(409).json({ error: 'referenced by other records' });
  }
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

export default app;
