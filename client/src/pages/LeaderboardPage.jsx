import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
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
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { staggerSx } from '../animations.js';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import { TableSkeleton } from '../components/Skeletons.jsx';

const MEDAL_COLORS = ['#eda100', '#a8a29e', '#c9803a'];

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
  const [gameId, setGameId] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { data: gamesData, isLoading: gamesLoading } = useQuery({
    queryKey: ['games', 'all'],
    queryFn: () => apiFetch('/api/games?pageSize=500'),
  });
  const games = useMemo(() => gamesData?.items ?? [], [gamesData]);

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', gameId, page, pageSize],
    queryFn: () => apiFetch(`/api/games/${gameId}/leaderboard?page=${page + 1}&pageSize=${pageSize}`),
    enabled: !!gameId,
  });

  return (
    <Box>
      <PageHeader
        icon={<EmojiEventsOutlinedIcon />}
        title="Leaderboard"
        subtitle="Ranked by conservative rating (μ − 3σ)"
      />

      <FormControl sx={{ mb: 3, minWidth: 220 }} size="small">
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

      {!gamesLoading && games.length === 0 && (
        <EmptyState
          icon={<EmojiEventsOutlinedIcon />}
          title="No games yet"
          subtitle="Add a game to start tracking ratings."
        />
      )}

      {!gameId && games.length > 0 && (
        <EmptyState
          icon={<EmojiEventsOutlinedIcon />}
          title="Pick a game"
          subtitle="Choose a game above to see its leaderboard."
        />
      )}

      {gameId && (
        <Card variant="outlined">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={48}>#</TableCell>
                  <TableCell>Player</TableCell>
                  <TableCell align="right">Rating</TableCell>
                  <TableCell align="right">Mu</TableCell>
                  <TableCell align="right">Sigma</TableCell>
                  <TableCell align="right">Matches</TableCell>
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
                          to={`/players/${p.player_id}`}
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
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                        {p.mu.toFixed(1)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                        {p.sigma.toFixed(1)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                        {p.matches_played}
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
      )}
    </Box>
  );
}
