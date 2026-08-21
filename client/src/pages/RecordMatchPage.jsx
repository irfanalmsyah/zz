import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import TeamPicker from '../components/TeamPicker.jsx';
import Toast from '../components/Toast.jsx';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function RecordMatchPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  const { data: gamesData } = useQuery({
    queryKey: ['games', 'all'],
    queryFn: () => apiFetch('/api/games?pageSize=500'),
  });
  const { data: playersData } = useQuery({
    queryKey: ['players', 'all'],
    queryFn: () => apiFetch('/api/players?pageSize=500'),
  });

  const games = gamesData?.items ?? [];
  const players = playersData?.items ?? [];

  const [gameId, setGameId] = useState('');
  const [team1, setTeam1] = useState([]);
  const [team2, setTeam2] = useState([]);
  const [outcome, setOutcome] = useState('team1_win');
  const [playedAt, setPlayedAt] = useState(today());

  const recordMatch = useMutation({
    mutationFn: () =>
      apiFetch(`/api/games/${gameId}/matches`, {
        method: 'POST',
        body: JSON.stringify({
          played_at: playedAt,
          outcome,
          team1_player_ids: team1,
          team2_player_ids: team2,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', gameId] });
      queryClient.invalidateQueries({ queryKey: ['matches', gameId] });
      queryClient.invalidateQueries({ queryKey: ['rating-history', gameId] });
      setTeam1([]);
      setTeam2([]);
      setToast({ severity: 'success', message: 'Match recorded' });
    },
    onError: (err) => setToast({ severity: 'error', message: err.message }),
  });

  function submit(e) {
    e.preventDefault();
    if (!gameId || team1.length === 0 || team2.length === 0) {
      setToast({ severity: 'error', message: 'Pick a game and at least one player per team' });
      return;
    }
    recordMatch.mutate();
  }

  return (
    <Box maxWidth={560}>
      <PageHeader icon={<AddCircleOutlineIcon />} title="Record match" subtitle="Log a result to update ratings" />

      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={submit}>
            <Box display="flex" gap={2} mb={3} flexWrap="wrap">
              <FormControl fullWidth sx={{ flex: 1, minWidth: 180 }}>
                <InputLabel>Game</InputLabel>
                <Select label="Game" value={gameId} onChange={(e) => setGameId(e.target.value)}>
                  {games.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                type="date"
                label="Date"
                sx={{ flex: 1, minWidth: 180 }}
                value={playedAt}
                onChange={(e) => setPlayedAt(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Teams
            </Typography>
            <Box mb={3}>
              <TeamPicker
                players={players}
                team1={team1}
                team2={team2}
                onChangeTeam1={setTeam1}
                onChangeTeam2={setTeam2}
              />
            </Box>

            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Outcome
            </Typography>
            <ToggleButtonGroup
              value={outcome}
              exclusive
              onChange={(_e, value) => value && setOutcome(value)}
              sx={{ mb: 3 }}
              fullWidth
            >
              <ToggleButton value="team1_win">Team 1 wins</ToggleButton>
              <ToggleButton value="team2_win">Team 2 wins</ToggleButton>
              <ToggleButton value="draw">Draw</ToggleButton>
            </ToggleButtonGroup>

            <Button type="submit" variant="contained" size="large" disabled={recordMatch.isPending} fullWidth>
              Record match
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Box>
  );
}
