import { Box, Container, LinearProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { apiFetch } from './api.js';
import GameLayout from './components/GameLayout.jsx';
import NavBar from './components/NavBar.jsx';
import GamesPage from './pages/GamesPage.jsx';
import HomePage from './pages/HomePage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MatchHistoryPage from './pages/MatchHistoryPage.jsx';
import PlayerDetailPage from './pages/PlayerDetailPage.jsx';
import PlayersPage from './pages/PlayersPage.jsx';
import RatingHistoryPage from './pages/RatingHistoryPage.jsx';
import RecordMatchPage from './pages/RecordMatchPage.jsx';
import StatsPage from './pages/StatsPage.jsx';

function RequireAuth({ authenticated, children }) {
  return authenticated ? children : <Navigate to="/login" replace />;
}

function AppShell() {
  const { data, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: () => apiFetch('/api/session'),
  });

  if (isLoading) {
    return (
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0 }}>
        <LinearProgress />
      </Box>
    );
  }

  const authenticated = !!data?.authenticated;

  return (
    <>
      <NavBar authenticated={authenticated} />
      <Container sx={{ mt: 3, mb: 6 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/games/:gameId" element={<GameLayout />}>
            <Route index element={<Navigate to="leaderboard" replace />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="progress" element={<RatingHistoryPage />} />
            <Route path="history" element={<MatchHistoryPage authenticated={authenticated} />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="players/:id" element={<PlayerDetailPage />} />
          </Route>
          <Route path="/players/:id" element={<PlayerDetailPage />} />
          <Route
            path="/players"
            element={
              <RequireAuth authenticated={authenticated}>
                <PlayersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/games"
            element={
              <RequireAuth authenticated={authenticated}>
                <GamesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/record"
            element={
              <RequireAuth authenticated={authenticated}>
                <RecordMatchPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
