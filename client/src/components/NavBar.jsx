import { AppBar, Button, Toolbar, Typography } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api.js';

export default function NavBar({ authenticated }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logout = useMutation({
    mutationFn: () => apiFetch('/api/logout', { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate('/leaderboard');
    },
  });

  return (
    <AppBar position="static">
      <Toolbar sx={{ flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ mr: 3 }}>
          Ratings
        </Typography>
        <Button color="inherit" component={Link} to="/leaderboard">
          Leaderboard
        </Button>
        <Button color="inherit" component={Link} to="/history">
          History
        </Button>
        {authenticated && (
          <>
            <Button color="inherit" component={Link} to="/record">
              Record match
            </Button>
            <Button color="inherit" component={Link} to="/players">
              Players
            </Button>
            <Button color="inherit" component={Link} to="/games">
              Games
            </Button>
            <Button color="inherit" onClick={() => logout.mutate()} sx={{ ml: 'auto' }}>
              Log out
            </Button>
          </>
        )}
        {!authenticated && (
          <Button color="inherit" component={Link} to="/login" sx={{ ml: 'auto' }}>
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
