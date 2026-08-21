import { Rating, TrueSkill } from 'ts-trueskill';
import { pool } from './db.js';

const env = new TrueSkill();

// Loads every match for a game, in chronological order, grouped by roster.
async function loadMatches(gameId) {
  const { rows } = await pool.query(
    `SELECT m.id AS match_id, m.played_at, m.outcome, mp.team, mp.player_id, p.name
     FROM matches m
     JOIN match_players mp ON mp.match_id = m.id
     JOIN players p ON p.id = mp.player_id
     WHERE m.game_id = $1
     ORDER BY m.played_at ASC, m.id ASC, mp.team ASC, mp.player_id ASC`,
    [gameId]
  );

  const matches = new Map();
  for (const row of rows) {
    let match = matches.get(row.match_id);
    if (!match) {
      match = { played_at: row.played_at, outcome: row.outcome, team1: [], team2: [] };
      matches.set(row.match_id, match);
    }
    const entry = { player_id: row.player_id, name: row.name };
    (row.team === 1 ? match.team1 : match.team2).push(entry);
  }
  return matches;
}

// Replays every match for a game, in chronological order, through TrueSkill.
// This is the only source of truth for ratings -- there is no stored "ratings" table.
async function replay(gameId) {
  const matches = await loadMatches(gameId);

  const ratings = new Map();
  const played = new Map();
  const names = new Map();
  const getRating = (id) => ratings.get(id) ?? new Rating();
  const changesByMatch = new Map();

  const toChange = (p, before, after) => ({
    player_id: p.player_id,
    name: p.name,
    mu_before: before.mu,
    sigma_before: before.sigma,
    mu_after: after.mu,
    sigma_after: after.sigma,
  });

  for (const [matchId, match] of matches) {
    const team1Before = match.team1.map((p) => getRating(p.player_id));
    const team2Before = match.team2.map((p) => getRating(p.player_id));
    const ranks =
      match.outcome === 'team1_win' ? [0, 1] : match.outcome === 'team2_win' ? [1, 0] : [0, 0];
    const [newTeam1, newTeam2] = env.rate([team1Before, team2Before], ranks);

    changesByMatch.set(matchId, {
      played_at: match.played_at,
      outcome: match.outcome,
      team1: match.team1.map((p, i) => toChange(p, team1Before[i], newTeam1[i])),
      team2: match.team2.map((p, i) => toChange(p, team2Before[i], newTeam2[i])),
    });

    match.team1.forEach((p, i) => {
      ratings.set(p.player_id, newTeam1[i]);
      played.set(p.player_id, (played.get(p.player_id) ?? 0) + 1);
      names.set(p.player_id, p.name);
    });
    match.team2.forEach((p, i) => {
      ratings.set(p.player_id, newTeam2[i]);
      played.set(p.player_id, (played.get(p.player_id) ?? 0) + 1);
      names.set(p.player_id, p.name);
    });
  }

  return { ratings, played, names, changesByMatch };
}

export async function computeLeaderboard(gameId) {
  const { ratings, played, names } = await replay(gameId);
  return [...ratings.entries()]
    .map(([player_id, r]) => ({
      player_id,
      name: names.get(player_id),
      mu: r.mu,
      sigma: r.sigma,
      conservative: r.mu - 3 * r.sigma,
      matches_played: played.get(player_id),
    }))
    .sort((a, b) => b.conservative - a.conservative);
}

// Per-match mu/sigma before and after, for every player in every match of the game.
export async function computeMatchRatingChanges(gameId) {
  const { changesByMatch } = await replay(gameId);
  return changesByMatch;
}

// Rating trajectory per player: one point per match they played, in chronological
// order, numbered by that player's own match count (not the game's match index).
export async function computeRatingHistory(gameId) {
  const { changesByMatch, names } = await replay(gameId);
  const pointsByPlayer = new Map();

  for (const change of changesByMatch.values()) {
    for (const p of [...change.team1, ...change.team2]) {
      const points = pointsByPlayer.get(p.player_id) ?? [];
      points.push({
        match_number: points.length + 1,
        played_at: change.played_at,
        mu: p.mu_after,
        sigma: p.sigma_after,
        conservative: p.mu_after - 3 * p.sigma_after,
      });
      pointsByPlayer.set(p.player_id, points);
    }
  }

  return [...pointsByPlayer.entries()]
    .map(([player_id, points]) => ({ player_id, name: names.get(player_id), points }))
    .sort((a, b) => b.points.length - a.points.length);
}

// Head-to-head record between two players: only counts matches where they were on
// opposing teams (a team-level outcome carries no valid signal about two teammates).
export async function computeHeadToHead(gameId, playerAId, playerBId) {
  const matches = await loadMatches(gameId);
  let aWins = 0;
  let bWins = 0;
  let draws = 0;
  const encounters = [];

  for (const [matchId, match] of matches) {
    const aTeam = match.team1.some((p) => p.player_id === playerAId)
      ? 1
      : match.team2.some((p) => p.player_id === playerAId)
        ? 2
        : null;
    const bTeam = match.team1.some((p) => p.player_id === playerBId)
      ? 1
      : match.team2.some((p) => p.player_id === playerBId)
        ? 2
        : null;
    if (!aTeam || !bTeam || aTeam === bTeam) continue;

    if (match.outcome === 'draw') draws += 1;
    else if ((match.outcome === 'team1_win' && aTeam === 1) || (match.outcome === 'team2_win' && aTeam === 2)) aWins += 1;
    else bWins += 1;

    encounters.push({
      match_id: matchId,
      played_at: match.played_at,
      outcome: match.outcome,
      a_team: aTeam,
      b_team: bTeam,
    });
  }

  return {
    player_a_id: playerAId,
    player_b_id: playerBId,
    a_wins: aWins,
    b_wins: bWins,
    draws,
    total: aWins + bWins + draws,
    matches: encounters,
  };
}

// The matches with the largest single-match rating swing, for any player, in a game.
export async function computeRatingSwings(gameId, limit = 20) {
  const { changesByMatch } = await replay(gameId);
  const swings = [];

  for (const [matchId, change] of changesByMatch) {
    for (const p of [...change.team1, ...change.team2]) {
      swings.push({
        match_id: matchId,
        played_at: change.played_at,
        outcome: change.outcome,
        player_id: p.player_id,
        name: p.name,
        mu_before: p.mu_before,
        mu_after: p.mu_after,
        delta: p.mu_after - p.mu_before,
      });
    }
  }

  return swings.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, limit);
}

// Cross-game activity for one player: matches played per game, plus that player's
// in-game rank/rating shown per game (never combined into one cross-game number --
// rating pools are independent per game and aren't comparable to each other).
export async function computeActivitySummary(playerId) {
  const { rows: playerRows } = await pool.query('SELECT id, name FROM players WHERE id = $1', [playerId]);
  if (playerRows.length === 0) return null;

  const { rows } = await pool.query(
    `SELECT g.id AS game_id, g.name AS game_name, COUNT(*) AS matches_played,
            MIN(m.played_at) AS first_played, MAX(m.played_at) AS last_played
     FROM match_players mp
     JOIN matches m ON m.id = mp.match_id
     JOIN games g ON g.id = m.game_id
     WHERE mp.player_id = $1
     GROUP BY g.id, g.name
     ORDER BY matches_played DESC`,
    [playerId]
  );

  const games = [];
  for (const row of rows) {
    const leaderboard = await computeLeaderboard(row.game_id);
    const rank = leaderboard.findIndex((r) => r.player_id === playerId);
    const entry = rank === -1 ? null : leaderboard[rank];
    games.push({
      game_id: row.game_id,
      game_name: row.game_name,
      matches_played: Number(row.matches_played),
      first_played: row.first_played,
      last_played: row.last_played,
      rank: rank === -1 ? null : rank + 1,
      conservative: entry?.conservative ?? null,
      mu: entry?.mu ?? null,
      sigma: entry?.sigma ?? null,
    });
  }

  return {
    player_id: playerId,
    name: playerRows[0].name,
    total_matches: games.reduce((sum, g) => sum + g.matches_played, 0),
    games,
  };
}
