import { Rating, TrueSkill } from 'ts-trueskill';
import { pool } from './db.js';

const env = new TrueSkill();

// Replays every match for a game, in chronological order, through TrueSkill.
// This is the only source of truth for ratings -- there is no stored "ratings" table.
async function replay(gameId) {
  const { rows } = await pool.query(
    `SELECT m.id AS match_id, m.outcome, mp.team, mp.player_id, p.name
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
      match = { outcome: row.outcome, team1: [], team2: [] };
      matches.set(row.match_id, match);
    }
    const entry = { player_id: row.player_id, name: row.name };
    (row.team === 1 ? match.team1 : match.team2).push(entry);
  }

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
