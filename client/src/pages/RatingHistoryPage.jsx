import ShowChartIcon from '@mui/icons-material/ShowChart';
import { Box, Card, CardContent, Chip, FormControl, InputLabel, MenuItem, Select, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import LineChart from '../components/LineChart.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { ChartSkeleton } from '../components/Skeletons.jsx';
import { colorForIndex } from '../palette.js';

const DEFAULT_VISIBLE = 8;

export default function RatingHistoryPage() {
  const [gameId, setGameId] = useState('');
  const [hiddenIds, setHiddenIds] = useState(() => new Set());

  const { data: gamesData } = useQuery({
    queryKey: ['games', 'all'],
    queryFn: () => apiFetch('/api/games?pageSize=500'),
  });
  const games = gamesData?.items ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['rating-history', gameId],
    queryFn: () => apiFetch(`/api/games/${gameId}/rating-history`),
    enabled: !!gameId,
  });
  const players = data?.items ?? [];

  // Stable color per player, independent of sort order or visibility toggles.
  const colorIndexById = useMemo(() => {
    const byName = [...players].sort((a, b) => a.name.localeCompare(b.name));
    return new Map(byName.map((p, i) => [p.player_id, i]));
  }, [players]);

  useEffect(() => {
    setHiddenIds(new Set(players.slice(DEFAULT_VISIBLE).map((p) => p.player_id)));
  }, [gameId]);

  function toggle(id) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const series = players
    .filter((p) => !hiddenIds.has(p.player_id))
    .map((p) => ({
      id: p.player_id,
      name: p.name,
      color: colorForIndex(colorIndexById.get(p.player_id) ?? 0),
      points: p.points,
    }));

  return (
    <Box>
      <PageHeader
        icon={<ShowChartIcon />}
        title="Rating progress"
        subtitle="Each player's rating after every match they've played"
      />

      <FormControl sx={{ mb: 3, minWidth: 220 }} size="small">
        <InputLabel>Game</InputLabel>
        <Select label="Game" value={gameId} onChange={(e) => setGameId(e.target.value)}>
          {games.map((g) => (
            <MenuItem key={g.id} value={g.id}>
              {g.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {!gameId && (
        <EmptyState
          icon={<ShowChartIcon />}
          title="Pick a game"
          subtitle="Choose a game above to see how ratings have moved over time."
        />
      )}

      {gameId && isLoading && <ChartSkeleton />}

      {gameId && !isLoading && players.length === 0 && (
        <EmptyState
          icon={<ShowChartIcon />}
          title="No matches yet"
          subtitle="Record a match for this game to start plotting ratings."
        />
      )}

      {gameId && !isLoading && players.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <LineChart series={series} />
            <Stack direction="row" spacing={1} sx={{ mt: 2.5, flexWrap: 'wrap', rowGap: 1 }}>
              {players.map((p) => {
                const hidden = hiddenIds.has(p.player_id);
                const color = colorForIndex(colorIndexById.get(p.player_id) ?? 0);
                return (
                  <Chip
                    key={p.player_id}
                    label={p.name}
                    size="small"
                    onClick={() => toggle(p.player_id)}
                    variant={hidden ? 'outlined' : 'filled'}
                    sx={{
                      bgcolor: hidden ? 'transparent' : `${color}1a`,
                      color: hidden ? 'text.secondary' : color,
                      borderColor: hidden ? 'divider' : color,
                      '&::before': {
                        content: '""',
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: hidden ? 'text.secondary' : color,
                        mr: 0.75,
                        opacity: hidden ? 0.4 : 1,
                      },
                    }}
                  />
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
