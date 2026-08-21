import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import {
  Box,
  Button,
  Card,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { staggerSx } from '../animations.js';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import { TableSkeleton } from '../components/Skeletons.jsx';
import Toast from '../components/Toast.jsx';

export default function PlayersPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [name, setName] = useState('');
  const [toast, setToast] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
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
    onError: (err) => setToast({ severity: 'error', message: err.message }),
  });

  const deletePlayer = useMutation({
    mutationFn: (id) => apiFetch(`/api/players/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['players'] }),
    onError: (err) => setToast({ severity: 'error', message: err.message }),
  });

  return (
    <Box>
      <PageHeader icon={<GroupsOutlinedIcon />} title="Players" subtitle="Everyone in the roster" />

      <Box
        component="form"
        display="flex"
        gap={1}
        mb={3}
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
          sx={{ minWidth: 240 }}
        />
        <Button type="submit" variant="contained" disabled={addPlayer.isPending || !name.trim()}>
          Add player
        </Button>
      </Box>

      <Card variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2} sx={{ p: 0, border: 0 }}>
                    <TableSkeleton columns={2} rows={5} />
                  </TableCell>
                </TableRow>
              ) : (
                (data?.items ?? []).map((p, i) => (
                  <TableRow key={p.id} sx={staggerSx(i)} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <PlayerAvatar name={p.name} colorIndex={i} size={32} />
                        <Typography sx={{ fontWeight: 500 }}>{p.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={`Delete ${p.name}`}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (window.confirm(`Delete ${p.name}?`)) deletePlayer.mutate(p.id);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {!isLoading && (data?.items?.length ?? 0) === 0 && (
          <EmptyState icon={<GroupsOutlinedIcon />} title="No players yet" subtitle="Add your first player above." />
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

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Box>
  );
}
