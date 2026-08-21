import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api.js';

const PUBLIC_LINKS = [
  { to: '/leaderboard', label: 'Leaderboard', icon: EmojiEventsOutlinedIcon },
  { to: '/progress', label: 'Progress', icon: ShowChartOutlinedIcon },
  { to: '/history', label: 'History', icon: HistoryOutlinedIcon },
];

const AUTH_LINKS = [
  { to: '/record', label: 'Record match', icon: AddCircleOutlineIcon },
  { to: '/players', label: 'Players', icon: GroupsOutlinedIcon },
  { to: '/games', label: 'Games', icon: SportsEsportsOutlinedIcon },
];

function NavLink({ to, label, Icon }) {
  const active = useLocation().pathname === to;
  return (
    <Button
      color="inherit"
      component={Link}
      to={to}
      startIcon={<Icon fontSize="small" />}
      sx={{
        px: 1.5,
        fontWeight: active ? 600 : 500,
        color: active ? 'primary.main' : 'text.secondary',
        bgcolor: active ? (theme) => `${theme.palette.primary.main}14` : 'transparent',
        '&:hover': { bgcolor: active ? undefined : 'action.hover' },
      }}
    >
      {label}
    </Button>
  );
}

function DrawerLink({ to, label, Icon, onClick }) {
  const active = useLocation().pathname === to;
  return (
    <ListItemButton component={Link} to={to} onClick={onClick} selected={active} sx={{ borderRadius: 2, mx: 1 }}>
      <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={label}
        slotProps={{ primary: { sx: { fontWeight: active ? 600 : 500, color: active ? 'primary.main' : 'text.primary' } } }}
      />
    </ListItemButton>
  );
}

export default function NavBar({ authenticated }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = [...PUBLIC_LINKS, ...(authenticated ? AUTH_LINKS : [])];

  const logout = useMutation({
    mutationFn: () => apiFetch('/api/logout', { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate('/leaderboard');
    },
  });

  return (
    <>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 0.5, minHeight: 64 }}>
          {isMobile && (
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            component={Link}
            to="/leaderboard"
            sx={{ mr: 3, color: 'primary.main', textDecoration: 'none', letterSpacing: -0.3 }}
          >
            Ratings
          </Typography>

          {!isMobile && links.map((l) => <NavLink key={l.to} to={l.to} label={l.label} Icon={l.icon} />)}

          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            {authenticated ? (
              <Button
                color="inherit"
                onClick={() => logout.mutate()}
                startIcon={<LogoutOutlinedIcon fontSize="small" />}
                sx={{ color: 'text.secondary' }}
              >
                Log out
              </Button>
            ) : (
              !isMobile && (
                <NavLink to="/login" label="Login" Icon={LoginOutlinedIcon} />
              )
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, pt: 2 }} role="presentation">
          <Typography variant="h6" sx={{ px: 2, mb: 1, color: 'primary.main' }}>
            Ratings
          </Typography>
          <List>
            {links.map((l) => (
              <DrawerLink key={l.to} to={l.to} label={l.label} Icon={l.icon} onClick={() => setDrawerOpen(false)} />
            ))}
            {!authenticated && (
              <DrawerLink to="/login" label="Login" Icon={LoginOutlinedIcon} onClick={() => setDrawerOpen(false)} />
            )}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
