import { Alert, Snackbar } from '@mui/material';

export default function Toast({ toast, onClose }) {
  return (
    <Snackbar
      open={!!toast}
      autoHideDuration={3500}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      {toast && (
        <Alert onClose={onClose} severity={toast.severity} variant="filled" sx={{ boxShadow: 3 }}>
          {toast.message}
        </Alert>
      )}
    </Snackbar>
  );
}
