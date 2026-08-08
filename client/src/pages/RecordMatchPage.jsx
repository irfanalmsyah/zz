import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch } from '../api.js';

function toggle(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function RecordMatchPage() {
  const queryClient = useQueryClient();

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
      setTeam1([]);
      setTeam2([]);
      window.alert('Match recorded');
    },
    onError: (err) => window.alert(err.message),
  });

  function submit(e) {
    e.preventDefault();
    if (!gameId || team1.length === 0 || team2.length === 0) {
      window.alert('Pick a game and at least one player per team');
      return;
    }
    recordMatch.mutate();
  }

  return (
    <Box maxWidth={480}>
      <Typography variant="h5" gutterBottom>
        Record match
      </Typography>
      <Box component="form" onSubmit={submit}>
        <FormControl fullWidth sx={{ mb: 2 }}>
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

        <Box>
          <Button type="submit" variant="contained" disabled={recordMatch.isPending}>
            Record match
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
