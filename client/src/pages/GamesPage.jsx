import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { staggerSx } from '../animations.js';
import { apiFetch } from '../api.js';

export default function GamesPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['games', page, pageSize],
    queryFn: () => apiFetch(`/api/games?page=${page + 1}&pageSize=${pageSize}`),
  });

  const addGame = useMutation({
    mutationFn: (gameName) =>
      apiFetch('/api/games', { method: 'POST', body: JSON.stringify({ name: gameName }) }),
    onSuccess: () => {
      setName('');
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
    onError: (err) => window.alert(err.message),
  });

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Games
      </Typography>
      <Box
        component="form"
        display="flex"
        gap={1}
        mb={2}
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) addGame.mutate(name.trim());
        }}
      >
        <TextField
          label="New game name"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="contained" disabled={addGame.isPending}>
          Add
        </Button>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(data?.items ?? []).map((g, i) => (
            <TableRow key={g.id} sx={staggerSx(i)}>
              <TableCell>{g.name}</TableCell>
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
    </Box>
  );
}
