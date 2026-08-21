import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { staggerSx } from '../animations.js';
import { apiFetch } from '../api.js';

export default function LeaderboardPage() {
  const [gameId, setGameId] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { data: gamesData } = useQuery({
    queryKey: ['games', 'all'],
    queryFn: () => apiFetch('/api/games?pageSize=500'),
  });
  const games = gamesData?.items ?? [];

  const { data } = useQuery({
    queryKey: ['leaderboard', gameId, page, pageSize],
    queryFn: () => apiFetch(`/api/games/${gameId}/leaderboard?page=${page + 1}&pageSize=${pageSize}`),
    enabled: !!gameId,
  });

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Leaderboard
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
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="right">Rating</TableCell>
                <TableCell align="right">Mu</TableCell>
                <TableCell align="right">Sigma</TableCell>
                <TableCell align="right">Matches</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items ?? []).map((p, i) => (
                <TableRow key={p.player_id} sx={staggerSx(i)}>
                  <TableCell>{page * pageSize + i + 1}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell align="right">{p.conservative.toFixed(1)}</TableCell>
                  <TableCell align="right">{p.mu.toFixed(1)}</TableCell>
                  <TableCell align="right">{p.sigma.toFixed(1)}</TableCell>
                  <TableCell align="right">{p.matches_played}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
