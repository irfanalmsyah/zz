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
import { apiFetch } from '../api.js';

export default function PlayersPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['players', page, pageSize],
    queryFn: () => apiFetch(`/api/players?page=${page + 1}&pageSize=${pageSize}`),
  });

  const addPlayer = useMutation({
    mutationFn: (playerName) =>
      apiFetch('/api/players', { method: 'POST', body: JSON.stringify({ name: playerName }) }),
    onSuccess: () => {
      setName('');
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
    onError: (err) => window.alert(err.message),
  });

  const deletePlayer = useMutation({
    mutationFn: (id) => apiFetch(`/api/players/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['players'] }),
    onError: (err) => window.alert(err.message),
  });

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Players
      </Typography>
      <Box
        component="form"
        display="flex"
        gap={1}
        mb={2}
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) addPlayer.mutate(name.trim());
        }}
      >
        <TextField
          label="New player name"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="contained" disabled={addPlayer.isPending}>
          Add
        </Button>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(data?.items ?? []).map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.name}</TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  color="error"
                  onClick={() => {
                    if (window.confirm(`Delete ${p.name}?`)) deletePlayer.mutate(p.id);
                  }}
                >
                  Delete
                </Button>
              </TableCell>
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
