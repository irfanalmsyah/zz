import { Chip, Divider, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PlayerAvatar from './PlayerAvatar.jsx';

const OUTCOME_LABEL = {
  team1_win: 'Team 1 won',
  team2_win: 'Team 2 won',
  draw: 'Draw',
};

function fmt(n) {
  return n.toFixed(1);
}

function DeltaChip({ delta }) {
  const positive = delta >= 0;
  const color = delta === 0 ? 'text.secondary' : positive ? 'success.main' : 'error.main';
  return (
    <Typography component="span" variant="caption" sx={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
      {positive ? '+' : ''}
      {fmt(delta)}
    </Typography>
  );
}

function TeamColumn({ team, won, gameId }) {
  return (
    <Stack spacing={1} flex={1} minWidth={160}>
      {team.map((p, i) => (
        <Stack key={p.player_id} direction="row" alignItems="center" spacing={1}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            component={RouterLink}
            to={`/games/${gameId}/players/${p.player_id}`}
            sx={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
          >
            <PlayerAvatar name={p.name} colorIndex={i} size={26} />
            <Typography variant="body2" sx={{ fontWeight: won ? 600 : 400 }} noWrap>
              {p.name}
            </Typography>
          </Stack>
          {p.conservative_after != null && <DeltaChip delta={p.conservative_after - p.conservative_before} />}
        </Stack>
      ))}
    </Stack>
  );
}

// Renders one match's date/outcome header + both team rosters (with per-match rating
// deltas). Used by both MatchHistoryPage (single game) and PlayerDetailPage's
// cross-game match history (gameName shown to disambiguate which game each row is from).
export default function MatchCard({ match, gameName }) {
  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {match.played_at}
          </Typography>
          {gameName && <Chip size="small" label={gameName} variant="outlined" />}
        </Stack>
        <Chip
          size="small"
          label={OUTCOME_LABEL[match.outcome]}
          color={match.outcome === 'draw' ? 'default' : 'primary'}
          variant={match.outcome === 'draw' ? 'outlined' : 'filled'}
          sx={match.outcome !== 'draw' ? { bgcolor: 'primary.main', color: '#fff' } : undefined}
        />
      </Stack>
      <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
        <TeamColumn team={match.team1} won={match.outcome === 'team1_win'} gameId={match.game_id} />
        <TeamColumn team={match.team2} won={match.outcome === 'team2_win'} gameId={match.game_id} />
      </Stack>
    </>
  );
}
