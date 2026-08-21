import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined';
import {
  Box,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
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
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { TableSkeleton } from '../components/Skeletons.jsx';
import Toast from '../components/Toast.jsx';

export default function GamesPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [name, setName] = useState('');
  const [toast, setToast] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
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
    onError: (err) => setToast({ severity: 'error', message: err.message }),
  });

  return (
    <Box>
      <PageHeader icon={<SportsEsportsOutlinedIcon />} title="Games" subtitle="Each game keeps its own ratings" />

      <Box
        component="form"
        display="flex"
        gap={1}
        mb={3}
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
          sx={{ minWidth: 240 }}
        />
        <Button type="submit" variant="contained" disabled={addGame.isPending || !name.trim()}>
          Add game
        </Button>
      </Box>

      <Card variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell sx={{ p: 0, border: 0 }}>
                    <TableSkeleton columns={1} rows={5} />
                  </TableCell>
                </TableRow>
              ) : (
                (data?.items ?? []).map((g, i) => (
                  <TableRow key={g.id} sx={staggerSx(i)} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 500 }}>{g.name}</Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {!isLoading && (data?.items?.length ?? 0) === 0 && (
          <EmptyState icon={<SportsEsportsOutlinedIcon />} title="No games yet" subtitle="Add your first game above." />
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
