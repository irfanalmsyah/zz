import { CircularProgress, Container } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { apiFetch } from './api.js';
import NavBar from './components/NavBar.jsx';
import GamesPage from './pages/GamesPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MatchHistoryPage from './pages/MatchHistoryPage.jsx';
import PlayersPage from './pages/PlayersPage.jsx';
import RecordMatchPage from './pages/RecordMatchPage.jsx';

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
      <Container sx={{ mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  const authenticated = !!data?.authenticated;

  return (
    <>
      <NavBar authenticated={authenticated} />
      <Container sx={{ mt: 3, mb: 6 }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route
            path="/history"
            element={<MatchHistoryPage authenticated={authenticated} />}
          />
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
          <Route path="*" element={<Navigate to="/leaderboard" replace />} />
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
