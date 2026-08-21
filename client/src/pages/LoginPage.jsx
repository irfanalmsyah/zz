import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert, Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api.js';

export default function LoginPage() {
  const [passcode, setPasscode] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const login = useMutation({
    mutationFn: () =>
      apiFetch('/api/login', { method: 'POST', body: JSON.stringify({ passcode }) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate('/players');
    },
  });

  return (
    <Box maxWidth={380} mx="auto" sx={{ mt: { xs: 2, sm: 6 } }}>
      <Card variant="outlined">
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <LockOutlinedIcon fontSize="small" />
          </Box>
          <Typography variant="h5" gutterBottom>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter the passcode to manage players, games and matches.
          </Typography>
          {login.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Invalid passcode
            </Alert>
          )}
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate();
            }}
          >
            <TextField
              type="password"
              label="Passcode"
              fullWidth
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              sx={{ mb: 2.5 }}
            />
            <Button type="submit" variant="contained" size="large" fullWidth disabled={login.isPending}>
              Log in
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
