import { Alert, Box, Button, TextField, Typography } from '@mui/material';
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
    <Box maxWidth={360} mx="auto">
      <Typography variant="h5" gutterBottom>
        Login
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
          sx={{ mb: 2 }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={login.isPending}>
          Log in
        </Button>
      </Box>
    </Box>
  );
}
