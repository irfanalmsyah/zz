import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Stack,
  TablePagination,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { staggerSx } from '../animations.js';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import MatchCard from '../components/MatchCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { CardListSkeleton } from '../components/Skeletons.jsx';
import TeamPicker from '../components/TeamPicker.jsx';
import Toast from '../components/Toast.jsx';

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
        if (team1.length === 0 || team2.length === 0) return;
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
      <Box mb={2}>
        <TeamPicker players={players} team1={team1} team2={team2} onChangeTeam1={setTeam1} onChangeTeam2={setTeam2} />
      </Box>
      <ToggleButtonGroup
        value={outcome}
        exclusive
        onChange={(_e, value) => value && setOutcome(value)}
        size="small"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="team1_win">Team 1 wins</ToggleButton>
        <ToggleButton value="team2_win">Team 2 wins</ToggleButton>
        <ToggleButton value="draw">Draw</ToggleButton>
      </ToggleButtonGroup>
      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" disabled={saving || team1.length === 0 || team2.length === 0}>
          Save
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Stack>
    </Box>
  );
}

export default function MatchHistoryPage({ authenticated }) {
  const { gameId } = useParams();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  const queryClient = useQueryClient();

  const { data: playersData } = useQuery({
    queryKey: ['players', 'all'],
    queryFn: () => apiFetch('/api/players?pageSize=500'),
    enabled: authenticated,
  });
  const players = playersData?.items ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['matches', gameId, page, pageSize],
    queryFn: () => apiFetch(`/api/games/${gameId}/matches?page=${page + 1}&pageSize=${pageSize}`),
  });

  function invalidateAfterChange() {
    queryClient.invalidateQueries({ queryKey: ['matches', gameId] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard', gameId] });
    queryClient.invalidateQueries({ queryKey: ['rating-history', gameId] });
  }

  const updateMatch = useMutation({
    mutationFn: ({ id, payload }) =>
      apiFetch(`/api/matches/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      setEditingId(null);
      invalidateAfterChange();
    },
    onError: (err) => setToast({ severity: 'error', message: err.message }),
  });

  const deleteMatch = useMutation({
    mutationFn: (id) => apiFetch(`/api/matches/${id}`, { method: 'DELETE' }),
    onSuccess: invalidateAfterChange,
    onError: (err) => setToast({ severity: 'error', message: err.message }),
  });

  return (
    <Box>
      <PageHeader icon={<HistoryOutlinedIcon />} title="Match history" subtitle="Every recorded result, most recent first" />

      {isLoading && <CardListSkeleton count={4} />}

      {!isLoading && (
        <>
          {(data?.items?.length ?? 0) === 0 ? (
            <EmptyState icon={<HistoryOutlinedIcon />} title="No matches yet" subtitle="Record a match for this game to see it here." />
          ) : (
            <Stack spacing={2}>
              {data.items.map((m, i) => (
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
                      <MatchCard match={m} />
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
          )}
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

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Box>
  );
}
