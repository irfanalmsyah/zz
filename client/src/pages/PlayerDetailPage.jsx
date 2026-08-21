import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import { CardListSkeleton, StatRowSkeleton } from '../components/Skeletons.jsx';

function fmt(n) {
  return n == null ? '—' : n.toFixed(1);
}

export default function PlayerDetailPage() {
  const { id } = useParams();
  const [h2hGameId, setH2hGameId] = useState('');
  const [opponentId, setOpponentId] = useState('');

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['activity', id],
    queryFn: () => apiFetch(`/api/players/${id}/activity`),
  });

  const { data: gamesData } = useQuery({
    queryKey: ['games', 'all'],
    queryFn: () => apiFetch('/api/games?pageSize=500'),
  });
  const games = gamesData?.items ?? [];

  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard', h2hGameId, 'all'],
    queryFn: () => apiFetch(`/api/games/${h2hGameId}/leaderboard?pageSize=500`),
    enabled: !!h2hGameId,
  });
  const opponents = (leaderboardData?.items ?? []).filter((p) => p.player_id !== id);

  const { data: h2h, isLoading: h2hLoading } = useQuery({
    queryKey: ['h2h', h2hGameId, id, opponentId],
    queryFn: () => apiFetch(`/api/games/${h2hGameId}/head-to-head?playerA=${id}&playerB=${opponentId}`),
    enabled: !!h2hGameId && !!opponentId,
  });

  const opponentName = opponents.find((p) => p.player_id === opponentId)?.name ?? 'Opponent';

  return (
    <Box>
      <PageHeader
        icon={<PlayerAvatar name={activity?.name ?? '?'} colorIndex={Number(id) || 0} size={40} />}
        title={activity?.name ?? 'Player'}
        subtitle="Activity across every game, and head-to-head records"
      />

      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
        Activity
      </Typography>

      {activityLoading && <StatRowSkeleton />}

      {!activityLoading && (activity?.games?.length ?? 0) === 0 && (
        <EmptyState icon={<PersonOutlineIcon />} title="No matches yet" subtitle="This player hasn't played any games yet." />
      )}

      {!activityLoading && (activity?.games?.length ?? 0) > 0 && (
        <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2} sx={{ mb: 4 }}>
          {activity.games.map((g) => (
            <Card key={g.game_id} variant="outlined" sx={{ minWidth: 200, flex: '1 1 200px' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{g.game_name}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  {g.rank && (
                    <Chip
                      size="small"
                      label={`#${g.rank}`}
                      sx={{ bgcolor: 'primary.main', color: '#fff', fontWeight: 700 }}
                    />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {g.matches_played} matches
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Rating {fmt(g.conservative)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {g.first_played} – {g.last_played}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
        Head-to-head
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', rowGap: 2 }}>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel>Game</InputLabel>
          <Select
            label="Game"
            value={h2hGameId}
            onChange={(e) => {
              setH2hGameId(e.target.value);
              setOpponentId('');
            }}
          >
            {games.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }} size="small" disabled={!h2hGameId}>
          <InputLabel>Opponent</InputLabel>
          <Select label="Opponent" value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
            {opponents.map((p) => (
              <MenuItem key={p.player_id} value={p.player_id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {(!h2hGameId || !opponentId) && (
        <EmptyState
          icon={<PersonOutlineIcon />}
          title="Pick a game and an opponent"
          subtitle="Choose both above to see the head-to-head record. Only matches where you were on opposing teams count."
        />
      )}

      {h2hGameId && opponentId && h2hLoading && <CardListSkeleton count={1} />}

      {h2hGameId && opponentId && !h2hLoading && h2h && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h5">{h2h.a_wins}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {activity?.name ?? 'You'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="h5" color="text.secondary">
                  {h2h.draws}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Draws
                </Typography>
              </Box>
              <Box>
                <Typography variant="h5">{h2h.b_wins}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {opponentName}
                </Typography>
              </Box>
            </Stack>

            {h2h.total === 0 ? (
              <EmptyState title="No matches yet" subtitle="These two haven't faced each other on opposing teams." />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Result</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {h2h.matches.map((m) => {
                      const aWon =
                        (m.outcome === 'team1_win' && m.a_team === 1) ||
                        (m.outcome === 'team2_win' && m.a_team === 2);
                      const label = m.outcome === 'draw' ? 'Draw' : aWon ? `${activity?.name} won` : `${opponentName} won`;
                      return (
                        <TableRow key={m.match_id} hover>
                          <TableCell>{m.played_at}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={label}
                              variant={m.outcome === 'draw' ? 'outlined' : 'filled'}
                              sx={
                                m.outcome === 'draw'
                                  ? undefined
                                  : { bgcolor: aWon ? 'success.main' : 'error.main', color: '#fff' }
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
