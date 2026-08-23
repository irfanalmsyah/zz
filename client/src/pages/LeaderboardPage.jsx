import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import {
  Box,
  Card,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { staggerSx } from '../animations.js';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import { TableSkeleton } from '../components/Skeletons.jsx';

const MEDAL_COLORS = ['#eda100', '#a8a29e', '#c9803a'];
const FORM_COLOR = { W: '#0ca30c', L: '#d03b3b', D: '#5f5e6b' };

function FormBadges({ form }) {
  if (!form || form.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
      {form.map((letter, i) => (
        <Box
          key={i}
          sx={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            bgcolor: `${FORM_COLOR[letter]}22`,
            color: FORM_COLOR[letter],
          }}
        >
          {letter}
        </Box>
      ))}
    </Stack>
  );
}

function WLDCell({ wins, losses, draws }) {
  return (
    <Typography component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
      <Typography component="span" sx={{ color: 'success.main', fontWeight: 600 }}>
        {wins}
      </Typography>
      <Typography component="span" color="text.secondary">
        -
      </Typography>
      <Typography component="span" sx={{ color: 'error.main', fontWeight: 600 }}>
        {losses}
      </Typography>
      <Typography component="span" color="text.secondary">
        -
      </Typography>
      <Typography component="span" color="text.secondary">
        {draws}
      </Typography>
    </Typography>
  );
}

function RankBadge({ rank }) {
  const color = MEDAL_COLORS[rank - 1];
  if (!color) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ width: 28, textAlign: 'center' }}>
        {rank}
      </Typography>
    );
  }
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: `${color}22`,
        color,
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      {rank}
    </Box>
  );
}

export default function LeaderboardPage() {
  const { gameId } = useParams();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', gameId, page, pageSize],
    queryFn: () => apiFetch(`/api/games/${gameId}/leaderboard?page=${page + 1}&pageSize=${pageSize}`),
  });

  return (
    <Box>
      <PageHeader icon={<EmojiEventsOutlinedIcon />} title="Leaderboard" subtitle="Ranked by rating" />

      <Card variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={48}>#</TableCell>
                <TableCell>Player</TableCell>
                <TableCell align="right">Rating</TableCell>
                <TableCell align="right">Form</TableCell>
                <TableCell align="right">Matches</TableCell>
                <TableCell align="right">W-L-D</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                    <TableSkeleton columns={6} rows={6} />
                  </TableCell>
                </TableRow>
              ) : (
                (data?.items ?? []).map((p, i) => (
                  <TableRow key={p.player_id} sx={staggerSx(i)} hover>
                    <TableCell>
                      <RankBadge rank={page * pageSize + i + 1} />
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={1.25}
                        alignItems="center"
                        component={RouterLink}
                        to={`/games/${gameId}/players/${p.player_id}`}
                        sx={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <PlayerAvatar name={p.name} colorIndex={i} size={30} />
                        <Typography sx={{ fontWeight: 500 }}>{p.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {p.conservative.toFixed(1)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <FormBadges form={p.form} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                      {p.matches_played}
                    </TableCell>
                    <TableCell align="right">
                      <WLDCell wins={p.wins} losses={p.losses} draws={p.draws} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {!isLoading && (data?.items?.length ?? 0) === 0 && (
          <EmptyState title="No matches recorded" subtitle="Record a match for this game to populate the leaderboard." />
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
      </Card>
    </Box>
  );
}
