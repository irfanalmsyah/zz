import { Rating, TrueSkill } from 'ts-trueskill';
import { pool } from './db.js';

const env = new TrueSkill();

// Replays every match for a game, in chronological order, through TrueSkill.
// This is the only source of truth for ratings -- there is no stored "ratings" table.
export async function computeLeaderboard(gameId) {
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

  for (const match of matches.values()) {
    const team1Ratings = match.team1.map((p) => getRating(p.player_id));
    const team2Ratings = match.team2.map((p) => getRating(p.player_id));
    const ranks =
      match.outcome === 'team1_win' ? [0, 1] : match.outcome === 'team2_win' ? [1, 0] : [0, 0];
    const [newTeam1, newTeam2] = env.rate([team1Ratings, team2Ratings], ranks);

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
