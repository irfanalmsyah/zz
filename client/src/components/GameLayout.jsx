import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined';
import { Box, Skeleton, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { apiFetch } from '../api.js';

const TABS = [
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'progress', label: 'Progress' },
  { value: 'history', label: 'History' },
  { value: 'stats', label: 'Stats' },
];

export default function GameLayout() {
  const { gameId } = useParams();
  const location = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ['games', 'all'],
    queryFn: () => apiFetch('/api/games?pageSize=500'),
  });
  const game = (data?.items ?? []).find((g) => String(g.id) === String(gameId));

  const activeTab = TABS.find((t) => location.pathname.endsWith(`/${t.value}`))?.value ?? 'leaderboard';

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        component={RouterLink}
        to="/"
        sx={{ mb: 1.5, color: 'text.secondary', textDecoration: 'none', width: 'fit-content' }}
      >
        <ArrowBackIcon fontSize="small" />
        <Typography variant="body2">All games</Typography>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 2.5,
            bgcolor: 'primary.main',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <SportsEsportsOutlinedIcon />
        </Box>
        {isLoading ? (
          <Skeleton variant="text" width={160} height={36} />
        ) : (
          <Typography variant="h5">{game?.name ?? 'Game'}</Typography>
        )}
      </Stack>

      <Tabs value={activeTab} sx={{ mb: 3 }}>
        {TABS.map((t) => (
          <Tab key={t.value} label={t.label} value={t.value} component={RouterLink} to={`/games/${gameId}/${t.value}`} />
        ))}
      </Tabs>

      <Outlet />
    </Box>
  );
}
