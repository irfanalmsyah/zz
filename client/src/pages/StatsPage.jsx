import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import {
  Box,
  Card,
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
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useState } from 'react';
import { staggerSx } from '../animations.js';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import { TableSkeleton } from '../components/Skeletons.jsx';

function fmt(n) {
  return n.toFixed(1);
}

function DeltaChip({ delta }) {
  const positive = delta >= 0;
  const color = positive ? 'success.main' : 'error.main';
  return (
    <Typography component="span" sx={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
      {positive ? '+' : ''}
      {fmt(delta)}
    </Typography>
  );
}

const OUTCOME_LABEL = {
  team1_win: 'Team 1 won',
  team2_win: 'Team 2 won',
  draw: 'Draw',
};

export default function StatsPage() {
  const { gameId } = useParams();
  const [limit, setLimit] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['rating-swings', gameId, limit],
    queryFn: () => apiFetch(`/api/games/${gameId}/rating-swings?limit=${limit}`),
  });
  const swings = data?.items ?? [];

  return (
    <Box>
      <PageHeader
        icon={<InsightsOutlinedIcon />}
        title="Biggest rating swings"
        subtitle="The matches that moved a player's rating the most"
      />

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', rowGap: 2 }}>
        <FormControl sx={{ minWidth: 120 }} size="small">
          <InputLabel>Show</InputLabel>
          <Select label="Show" value={limit} onChange={(e) => setLimit(e.target.value)}>
            <MenuItem value={10}>Top 10</MenuItem>
            <MenuItem value={20}>Top 20</MenuItem>
            <MenuItem value={50}>Top 50</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Card variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Player</TableCell>
                <TableCell>Outcome</TableCell>
                <TableCell align="right">Rating before → after</TableCell>
                <TableCell align="right">Δ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                    <TableSkeleton columns={5} rows={6} />
                  </TableCell>
                </TableRow>
              ) : (
                swings.map((s, i) => (
                  <TableRow key={`${s.match_id}-${s.player_id}`} sx={staggerSx(i)} hover>
                    <TableCell>{s.played_at}</TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={1.25}
                        alignItems="center"
                        component={RouterLink}
                        to={`/games/${gameId}/players/${s.player_id}`}
                        sx={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <PlayerAvatar name={s.name} colorIndex={Number(s.player_id) || 0} size={28} />
                        <Typography sx={{ fontWeight: 500 }}>{s.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {OUTCOME_LABEL[s.outcome]}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                      {fmt(s.conservative_before)} → {fmt(s.conservative_after)}
                    </TableCell>
                    <TableCell align="right">
                      <DeltaChip delta={s.delta} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {!isLoading && swings.length === 0 && (
          <EmptyState title="No matches yet" subtitle="Record a match for this game to see rating swings." />
        )}
      </Card>
    </Box>
  );
}
