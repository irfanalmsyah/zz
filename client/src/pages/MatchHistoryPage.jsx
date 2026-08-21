import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { staggerSx } from '../animations.js';
import { apiFetch } from '../api.js';

function toggle(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

const OUTCOME_LABEL = {
  team1_win: 'Team 1 won',
  team2_win: 'Team 2 won',
  draw: 'Draw',
};

function names(team) {
  return team.map((p) => p.name).join(', ');
}

function fmt(n) {
  return n.toFixed(2);
}

function RatingChanges({ team }) {
  return (
    <Stack spacing={0.25} sx={{ mt: 0.5 }}>
      {team.map((p) => (
        <Typography key={p.player_id} variant="body2" color="text.secondary">
          {p.name}: μ {fmt(p.mu_before)} → {fmt(p.mu_after)} ({p.mu_after >= p.mu_before ? '+' : ''}
          {fmt(p.mu_after - p.mu_before)}), σ {fmt(p.sigma_before)} → {fmt(p.sigma_after)}
        </Typography>
      ))}
    </Stack>
  );
}

function EditMatchForm({ match, players, onSave, onCancel, saving }) {
  const [team1, setTeam1] = useState(match.team1.map((p) => p.player_id));
  const [team2, setTeam2] = useState(match.team2.map((p) => p.player_id));
  const [outcome, setOutcome] = useState(match.outcome);
  const [playedAt, setPlayedAt] = useState(match.played_at);

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (team1.length === 0 || team2.length === 0) {
          window.alert('Each team needs at least one player');
          return;
        }
        onSave({ played_at: playedAt, outcome, team1_player_ids: team1, team2_player_ids: team2 });
      }}
    >
      <TextField
        type="date"
        label="Date"
        fullWidth
        sx={{ mb: 2 }}
        value={playedAt}
        onChange={(e) => setPlayedAt(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <Box flex={1} minWidth={140}>
          <FormLabel>Team 1</FormLabel>
          {players.map((p) => (
            <FormControlLabel
              key={p.id}
              label={p.name}
              sx={{ display: 'block' }}
              control={
                <Checkbox
                  checked={team1.includes(p.id)}
                  onChange={() => setTeam1((t) => toggle(t, p.id))}
                />
              }
            />
          ))}
        </Box>
        <Box flex={1} minWidth={140}>
          <FormLabel>Team 2</FormLabel>
          {players.map((p) => (
            <FormControlLabel
              key={p.id}
              label={p.name}
              sx={{ display: 'block' }}
              control={
                <Checkbox
                  checked={team2.includes(p.id)}
                  onChange={() => setTeam2((t) => toggle(t, p.id))}
                />
              }
            />
          ))}
        </Box>
      </Box>
      <FormControl sx={{ mb: 2 }}>
        <FormLabel>Outcome</FormLabel>
        <RadioGroup row value={outcome} onChange={(e) => setOutcome(e.target.value)}>
          <FormControlLabel value="team1_win" control={<Radio />} label="Team 1 wins" />
          <FormControlLabel value="team2_win" control={<Radio />} label="Team 2 wins" />
          <FormControlLabel value="draw" control={<Radio />} label="Draw" />
        </RadioGroup>
      </FormControl>
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" disabled={saving}>
          Save
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Stack>
    </Box>
  );
}

export default function MatchHistoryPage({ authenticated }) {
  const [gameId, setGameId] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [editingId, setEditingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: gamesData } = useQuery({
    queryKey: ['games', 'all'],
    queryFn: () => apiFetch('/api/games?pageSize=500'),
  });
  const games = gamesData?.items ?? [];

  const { data: playersData } = useQuery({
    queryKey: ['players', 'all'],
    queryFn: () => apiFetch('/api/players?pageSize=500'),
    enabled: authenticated,
  });
  const players = playersData?.items ?? [];

  const { data } = useQuery({
    queryKey: ['matches', gameId, page, pageSize],
    queryFn: () => apiFetch(`/api/games/${gameId}/matches?page=${page + 1}&pageSize=${pageSize}`),
    enabled: !!gameId,
  });

  function invalidateAfterChange() {
    queryClient.invalidateQueries({ queryKey: ['matches', gameId] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard', gameId] });
  }

  const updateMatch = useMutation({
    mutationFn: ({ id, payload }) =>
      apiFetch(`/api/matches/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      setEditingId(null);
      invalidateAfterChange();
    },
    onError: (err) => window.alert(err.message),
  });

  const deleteMatch = useMutation({
    mutationFn: (id) => apiFetch(`/api/matches/${id}`, { method: 'DELETE' }),
    onSuccess: invalidateAfterChange,
    onError: (err) => window.alert(err.message),
  });

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Match history
      </Typography>
      <FormControl sx={{ mb: 2, minWidth: 200 }}>
        <InputLabel>Game</InputLabel>
        <Select
          label="Game"
          value={gameId}
          onChange={(e) => {
            setGameId(e.target.value);
            setPage(0);
          }}
        >
          {games.map((g) => (
            <MenuItem key={g.id} value={g.id}>
              {g.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {gameId && (
        <>
          <Stack spacing={2}>
            {(data?.items ?? []).map((m, i) => (
              <Card key={m.id} variant="outlined" sx={staggerSx(i)}>
                <CardContent>
                  {editingId === m.id ? (
                    <EditMatchForm
                      match={m}
                      players={players}
                      saving={updateMatch.isPending}
                      onCancel={() => setEditingId(null)}
                      onSave={(payload) => updateMatch.mutate({ id: m.id, payload })}
                    />
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {m.played_at}
                      </Typography>
                      <Typography>
                        {names(m.team1)} vs {names(m.team2)}
                      </Typography>
                      <Typography variant="body2">{OUTCOME_LABEL[m.outcome]}</Typography>
                      <RatingChanges team={m.team1} />
                      <RatingChanges team={m.team2} />
                    </>
                  )}
                </CardContent>
                {authenticated && editingId !== m.id && (
                  <CardActions>
                    <Button size="small" onClick={() => setEditingId(m.id)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        if (window.confirm('Delete this match?')) deleteMatch.mutate(m.id);
                      }}
                    >
                      Delete
                    </Button>
                  </CardActions>
                )}
              </Card>
            ))}
          </Stack>
          <TablePagination
            component="div"
            count={data?.total ?? 0}
            page={page}
            onPageChange={(_e, newPage) => setPage(newPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </>
      )}
    </Box>
  );
}
