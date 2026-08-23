import cookieParser from 'cookie-parser';
import express from 'express';
import { z } from 'zod';
import { login, logout, requireAuth, session } from './auth.js';
import { pool, withTransaction } from './db.js';
import { OG_COLORS, renderPlayerCardPng, renderTableCardPng } from './og.js';
import { paginate, parsePagination } from './pagination.js';
import {
  computeActivitySummary,
  computeHeadToHead,
  computeLeaderboard,
  computeMatchRatingChanges,
  computeRatingHistory,
  computeRatingSwings,
} from './trueskill.js';

const app = express();
app.set('trust proxy', true);
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

// Attaches team rosters and per-match rating deltas to a list of matches. Each
// row must carry at least { id, played_at, outcome, game_id }; rows may span
// more than one game (e.g. a single player's cross-game match history), so
// rating changes are computed once per distinct game_id present and merged.
async function hydrateMatchList(matchRows) {
  if (matchRows.length === 0) return [];

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

  const gameIds = [...new Set(matchRows.map((m) => m.game_id))];
  const changesByGame = new Map(
    await Promise.all(gameIds.map(async (gameId) => [gameId, await computeMatchRatingChanges(gameId)]))
  );

  return matchRows.map((m) => {
    const changes = changesByGame.get(m.game_id)?.get(m.id);
    const roster = rosterByMatch.get(m.id);
    return {
      id: m.id,
      played_at: m.played_at,
      outcome: m.outcome,
      game_id: m.game_id,
      ...(m.game_name != null && { game_name: m.game_name }),
      team1: changes?.team1 ?? roster?.team1 ?? [],
      team2: changes?.team2 ?? roster?.team2 ?? [],
    };
  });
}

async function getGameName(gameId) {
  const { rows } = await pool.query('SELECT name FROM games WHERE id = $1', [gameId]);
  return rows[0]?.name ?? null;
}

const MATCH_OUTCOME_LABEL = { team1_win: 'Team 1 won', team2_win: 'Team 2 won', draw: 'Draw' };

function absoluteUrl(req, pathAndQuery) {
  return `${req.protocol}://${req.get('host')}${pathAndQuery}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Minimal SSR shell for link-preview crawlers (see vercel.json's user-agent-matched
// rewrites): carries the real og:* tags + image, then bounces real visitors into the SPA.
function metaHtml({ title, description, imageUrl, redirectUrl }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">
</head>
<body>
<a href="${escapeHtml(redirectUrl)}">Continue to Ratings</a>
</body>
</html>`;
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
      'SELECT id, played_at, outcome, game_id FROM matches WHERE game_id = $1 ORDER BY played_at DESC, id DESC LIMIT $2 OFFSET $3',
      [gameId, limit, offset]
    );

    res.json(paginate(await hydrateMatchList(matchRows), total, page, pageSize));
  })
);

app.get(
  '/api/games/:gameId/rating-history',
  asyncHandler(async (req, res) => {
    const items = await computeRatingHistory(req.params.gameId);
    res.json({ items });
  })
);

app.get(
  '/api/games/:gameId/head-to-head',
  asyncHandler(async (req, res) => {
    const { playerA, playerB } = req.query;
    if (!playerA || !playerB || playerA === playerB) {
      return res.status(400).json({ error: 'playerA and playerB are required and must be different' });
    }
    res.json(await computeHeadToHead(req.params.gameId, String(playerA), String(playerB)));
  })
);

app.get(
  '/api/games/:gameId/rating-swings',
  asyncHandler(async (req, res) => {
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isInteger(limit) || limit < 1) limit = 20;
    limit = Math.min(limit, 100);
    const items = await computeRatingSwings(req.params.gameId, limit);
    res.json({ items });
  })
);

app.get(
  '/api/players/:id/activity',
  asyncHandler(async (req, res) => {
    const summary = await computeActivitySummary(req.params.id);
    if (!summary) return res.status(404).json({ error: 'not found' });
    res.json(summary);
  })
);

app.get(
  '/api/players/:id/matches',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { gameId } = req.query;
    const { page, pageSize, limit, offset } = parsePagination(req);

    const params = gameId ? [id, gameId] : [id];
    const gameFilter = gameId ? 'AND m.game_id = $2' : '';

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM matches m
       WHERE m.id IN (SELECT match_id FROM match_players WHERE player_id = $1) ${gameFilter}`,
      params
    );
    const total = Number(countRows[0].count);

    const { rows: matchRows } = await pool.query(
      `SELECT m.id, m.played_at, m.outcome, m.game_id, g.name AS game_name
       FROM matches m
       JOIN games g ON g.id = m.game_id
       WHERE m.id IN (SELECT match_id FROM match_players WHERE player_id = $1) ${gameFilter}
       ORDER BY m.played_at DESC, m.id DESC
       LIMIT ${gameId ? '$3' : '$2'} OFFSET ${gameId ? '$4' : '$3'}`,
      [...params, limit, offset]
    );

    res.json(paginate(await hydrateMatchList(matchRows), total, page, pageSize));
  })
);

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

// ---- Dynamic OG images + link-preview meta shells (no passcode required) ----

app.get(
  '/api/og/leaderboard/:gameId.png',
  asyncHandler(async (req, res) => {
    const { gameId } = req.params;
    const [gameName, all] = await Promise.all([getGameName(gameId), computeLeaderboard(gameId)]);
    const rows = all.slice(0, 10).map((p, i) => ({
      badge: i + 1,
      label: p.name,
      form: p.form,
      primary: p.conservative.toFixed(1),
    }));
    const png = await renderTableCardPng({
      title: gameName ? `${gameName} — Leaderboard` : 'Leaderboard',
      subtitle: `${all.length} player${all.length === 1 ? '' : 's'} ranked`,
      rows,
      emptyText: 'No players ranked yet',
    });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(png);
  })
);

app.get(
  '/api/og/progress/:gameId.png',
  asyncHandler(async (req, res) => {
    const { gameId } = req.params;
    const [gameName, all] = await Promise.all([getGameName(gameId), computeLeaderboard(gameId)]);
    const rows = all.slice(0, 10).map((p, i) => ({
      badge: i + 1,
      label: p.name,
      primary: p.conservative.toFixed(1),
      secondary: `${p.matches_played} match${p.matches_played === 1 ? '' : 'es'}`,
    }));
    const png = await renderTableCardPng({
      title: gameName ? `${gameName} — Rating Progress` : 'Rating Progress',
      subtitle: 'Current standings',
      rows,
      emptyText: 'No players ranked yet',
    });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(png);
  })
);

app.get(
  '/api/og/stats/:gameId.png',
  asyncHandler(async (req, res) => {
    const { gameId } = req.params;
    const [gameName, swings] = await Promise.all([getGameName(gameId), computeRatingSwings(gameId, 10)]);
    const rows = swings.map((s) => ({
      label: s.name,
      primary: `${s.delta >= 0 ? '+' : ''}${s.delta.toFixed(1)}`,
      primaryColor: s.delta >= 0 ? OG_COLORS.success : OG_COLORS.error,
      secondary: s.played_at,
    }));
    const png = await renderTableCardPng({
      title: gameName ? `${gameName} — Biggest Rating Swings` : 'Biggest Rating Swings',
      subtitle: 'The matches that moved a rating the most',
      rows,
      emptyText: 'No matches yet',
    });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(png);
  })
);

app.get(
  '/api/og/history/:gameId.png',
  asyncHandler(async (req, res) => {
    const { gameId } = req.params;
    const gameName = await getGameName(gameId);
    const { rows: matchRows } = await pool.query(
      'SELECT id, played_at, outcome, game_id FROM matches WHERE game_id = $1 ORDER BY played_at DESC, id DESC LIMIT 10',
      [gameId]
    );
    const items = await hydrateMatchList(matchRows);
    const rows = items.map((m) => ({
      label: `${m.team1.map((p) => p.name).join(', ')} vs ${m.team2.map((p) => p.name).join(', ')}`,
      primary: MATCH_OUTCOME_LABEL[m.outcome],
      secondary: m.played_at,
    }));
    const png = await renderTableCardPng({
      title: gameName ? `${gameName} — Match History` : 'Match History',
      subtitle: `${items.length} most recent match${items.length === 1 ? '' : 'es'}`,
      rows,
      emptyText: 'No matches recorded yet',
    });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(png);
  })
);

app.get(
  '/api/og/player/:playerId.png',
  asyncHandler(async (req, res) => {
    const { playerId } = req.params;
    const { gameId } = req.query;
    const summary = await computeActivitySummary(playerId);
    if (!summary) return res.status(404).send('not found');

    const scoped = gameId ? summary.games.find((g) => String(g.game_id) === String(gameId)) : null;
    let subtitle;
    let stats;
    if (scoped) {
      subtitle = scoped.game_name;
      stats = [
        { label: 'Rating', value: scoped.conservative != null ? scoped.conservative.toFixed(1) : '—' },
        { label: 'Rank', value: scoped.rank != null ? `#${scoped.rank}` : '—' },
        { label: 'Matches', value: scoped.matches_played },
      ];
    } else {
      const top = [...summary.games].sort((a, b) => (b.matches_played ?? 0) - (a.matches_played ?? 0))[0];
      subtitle = `${summary.total_matches} match${summary.total_matches === 1 ? '' : 'es'} across ${summary.games.length} game${summary.games.length === 1 ? '' : 's'}`;
      stats = [
        { label: 'Games played', value: summary.games.length },
        { label: 'Total matches', value: summary.total_matches },
        { label: top ? `Top: ${top.game_name}` : 'Rating', value: top?.conservative != null ? top.conservative.toFixed(1) : '—' },
      ];
    }

    const png = await renderPlayerCardPng({ name: summary.name, subtitle, stats });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(png);
  })
);

app.get(
  '/api/meta/:kind',
  asyncHandler(async (req, res) => {
    const { kind } = req.params;
    const { gameId, playerId } = req.query;

    if (kind === 'player') {
      if (!playerId) return res.status(400).send('playerId required');
      const summary = await computeActivitySummary(playerId);
      if (!summary) return res.status(404).send('not found');

      const scoped = gameId ? summary.games.find((g) => String(g.game_id) === String(gameId)) : null;
      const title = scoped ? `${summary.name} — ${scoped.game_name}` : `${summary.name} — Ratings`;
      const description = scoped
        ? `Rating ${scoped.conservative != null ? scoped.conservative.toFixed(1) : '—'} · ${scoped.matches_played} matches in ${scoped.game_name}`
        : `${summary.total_matches} matches across ${summary.games.length} game${summary.games.length === 1 ? '' : 's'}`;
      const imageUrl = absoluteUrl(req, `/api/og/player/${playerId}.png${gameId ? `?gameId=${gameId}` : ''}`);
      const redirectUrl = gameId ? `/games/${gameId}/players/${playerId}` : `/players/${playerId}`;
      return res.send(metaHtml({ title, description, imageUrl, redirectUrl }));
    }

    const KIND = {
      leaderboard: { label: 'Leaderboard', path: 'leaderboard' },
      progress: { label: 'Rating Progress', path: 'progress' },
      history: { label: 'Match History', path: 'history' },
      stats: { label: 'Biggest Rating Swings', path: 'stats' },
    }[kind];
    if (!KIND) return res.status(404).send('not found');
    if (!gameId) return res.status(400).send('gameId required');

    const gameName = await getGameName(gameId);
    if (!gameName) return res.status(404).send('not found');

    let description = gameName;
    if (kind === 'leaderboard' || kind === 'progress') {
      const all = await computeLeaderboard(gameId);
      description = all.length
        ? `${all[0].name} leads at ${all[0].conservative.toFixed(1)} · ${all.length} player${all.length === 1 ? '' : 's'}`
        : 'No players ranked yet';
    } else if (kind === 'stats') {
      const [top] = await computeRatingSwings(gameId, 1);
      description = top ? `Biggest mover: ${top.name} (${top.delta >= 0 ? '+' : ''}${top.delta.toFixed(1)})` : 'No matches yet';
    } else if (kind === 'history') {
      const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM matches WHERE game_id = $1', [gameId]);
      description = `${countRows[0].count} matches recorded`;
    }

    const title = `${gameName} — ${KIND.label}`;
    const imageUrl = absoluteUrl(req, `/api/og/${kind}/${gameId}.png`);
    const redirectUrl = `/games/${gameId}/${KIND.path}`;
    res.send(metaHtml({ title, description, imageUrl, redirectUrl }));
  })
);

// ---- Everything below requires the passcode ----

app.use(requireAuth);

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
