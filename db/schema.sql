-- Run this once by hand in the Supabase SQL editor. No migration framework.

-- Players in the friend group. Global, shared across every game.
CREATE TABLE players (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Games: independent, user-defined rating pools (e.g. "Chess", "EAFC", "Padel", "Chess Blitz").
CREATE TABLE games (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Matches: source of truth. Ratings are always derived by replaying these in order.
CREATE TABLE matches (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  played_at DATE NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('team1_win', 'team2_win', 'draw')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ordering used by every leaderboard replay / history query.
CREATE INDEX idx_matches_game_replay_order ON matches (game_id, played_at, id);

-- Generic team roster, arbitrary team size (1 for 1v1, 2+ for doubles etc).
CREATE TABLE match_players (
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team SMALLINT NOT NULL CHECK (team IN (1, 2)),
  player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  PRIMARY KEY (match_id, player_id)
);

CREATE INDEX idx_match_players_player ON match_players (player_id);
