import { AppBar, Button, Toolbar, Typography } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api.js';

function NavLink({ to, children, sx }) {
  const active = useLocation().pathname === to;
  return (
    <Button
      color="inherit"
      component={Link}
      to={to}
      sx={{
        fontWeight: active ? 600 : 400,
        color: active ? 'primary.main' : 'text.secondary',
        ...sx,
      }}
    >
      {children}
    </Button>
  );
}

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
        <Typography variant="h6" sx={{ mr: 3, color: 'primary.main' }}>
          Ratings
        </Typography>
        <NavLink to="/leaderboard">Leaderboard</NavLink>
        <NavLink to="/history">History</NavLink>
        {authenticated && (
          <>
            <NavLink to="/record">Record match</NavLink>
            <NavLink to="/players">Players</NavLink>
            <NavLink to="/games">Games</NavLink>
            <Button
              color="inherit"
              onClick={() => logout.mutate()}
              sx={{ ml: 'auto', color: 'text.secondary' }}
            >
              Log out
            </Button>
          </>
        )}
        {!authenticated && (
          <NavLink to="/login" sx={{ ml: 'auto' }}>
            Login
          </NavLink>
        )}
      </Toolbar>
    </AppBar>
  );
}
