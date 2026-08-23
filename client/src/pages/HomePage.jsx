import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined';
import { Box, Card, CardActionArea, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { staggerSx } from '../animations.js';
import { apiFetch } from '../api.js';
import EmptyState from '../components/EmptyState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';

function CardGridSkeleton({ count = 6 }) {
  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rounded" width={200} height={64} sx={{ borderRadius: 3 }} />
      ))}
    </Stack>
  );
}

export default function HomePage() {
  const { data: gamesData, isLoading: gamesLoading } = useQuery({
    queryKey: ['games', 'all'],
    queryFn: () => apiFetch('/api/games?pageSize=500'),
  });
  const games = gamesData?.items ?? [];

  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ['players', 'all'],
    queryFn: () => apiFetch('/api/players?pageSize=500'),
  });
  const players = playersData?.items ?? [];

  return (
    <Box>
      <PageHeader title="Ratings" subtitle="Pick a game to see its leaderboard, or jump straight to a player." />

      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
        Games
      </Typography>

      {gamesLoading && <CardGridSkeleton />}

      {!gamesLoading && games.length === 0 && (
        <EmptyState icon={<SportsEsportsOutlinedIcon />} title="No games yet" subtitle="Ask an admin to add one." />
      )}

      {!gamesLoading && games.length > 0 && (
        <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2} sx={{ mb: 4 }}>
          {games.map((g, i) => (
            <Card key={g.id} variant="outlined" sx={{ minWidth: 200, ...staggerSx(i) }}>
              <CardActionArea component={RouterLink} to={`/games/${g.id}/leaderboard`}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      <SportsEsportsOutlinedIcon fontSize="small" />
                    </Box>
                    <Typography sx={{ fontWeight: 600 }}>{g.name}</Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}

      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
        Players
      </Typography>

      {playersLoading && <CardGridSkeleton />}

      {!playersLoading && players.length === 0 && (
        <EmptyState icon={<GroupsOutlinedIcon />} title="No players yet" subtitle="Ask an admin to add one." />
      )}

      {!playersLoading && players.length > 0 && (
        <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={2}>
          {players.map((p, i) => (
            <Card key={p.id} variant="outlined" sx={{ minWidth: 200, ...staggerSx(i) }}>
              <CardActionArea component={RouterLink} to={`/players/${p.id}`}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <PlayerAvatar name={p.name} colorIndex={i} size={36} />
                    <Typography sx={{ fontWeight: 600 }}>{p.name}</Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
