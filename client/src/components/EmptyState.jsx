import { Box, Typography } from '@mui/material';

export default function EmptyState({ icon, title, subtitle }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 8,
        px: 3,
        color: 'text.secondary',
      }}
    >
      {icon && (
        <Box sx={{ mb: 1.5, opacity: 0.5, '& svg': { fontSize: 40 } }}>{icon}</Box>
      )}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
        {title}
      </Typography>
      {subtitle && <Typography variant="body2">{subtitle}</Typography>}
    </Box>
  );
}
