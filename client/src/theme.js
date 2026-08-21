import { createTheme } from '@mui/material/styles';

const easeOut = 'cubic-bezier(0.23, 1, 0.32, 1)';
const easeInOut = 'cubic-bezier(0.77, 0, 0.175, 1)';

export const theme = createTheme({
  shape: { borderRadius: 12 },
  palette: {
    primary: { main: '#4f46e5', dark: '#4338ca', light: '#818cf8' },
    secondary: { main: '#0ca30c' },
    error: { main: '#d03b3b' },
    warning: { main: '#c98500' },
    success: { main: '#0ca30c' },
    background: { default: '#f7f7f9', paper: '#ffffff' },
    text: { primary: '#16161a', secondary: '#5f5e6b' },
    divider: 'rgba(22, 22, 26, 0.08)',
  },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 700, letterSpacing: -0.5 },
    h5: { fontWeight: 700, letterSpacing: -0.3 },
    h6: { fontWeight: 600 },
    subtitle1: { color: '#5f5e6b' },
    body2: { color: '#5f5e6b' },
  },
  shadows: [
    'none',
    '0 1px 2px rgba(22, 22, 26, 0.06)',
    '0 2px 6px rgba(22, 22, 26, 0.07)',
    '0 4px 10px rgba(22, 22, 26, 0.08)',
    ...Array(21).fill('0 8px 24px rgba(22, 22, 26, 0.10)'),
  ],
  transitions: {
    easing: { easeOut, easeInOut },
  },
  components: {
    MuiButtonBase: {
      styleOverrides: {
        root: {
          transition: `transform 160ms ${easeOut}`,
          '&:active': { transform: 'scale(0.97)' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { fontWeight: 600, textTransform: 'none', borderRadius: 10 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { transition: `background-color 150ms ${easeOut}, color 150ms ${easeOut}` },
      },
    },
    MuiAppBar: {
      defaultProps: { color: 'inherit' },
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(22, 22, 26, 0.08)',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiMenu: {
      defaultProps: { transitionDuration: 180 },
    },
    MuiPopover: {
      defaultProps: { transitionDuration: 180 },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: `background-color 150ms ${easeOut}`,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, color: '#5f5e6b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.4 },
        root: { borderBottomColor: 'rgba(22, 22, 26, 0.06)' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid rgba(22, 22, 26, 0.08)',
          transition: `box-shadow 200ms ${easeOut}, transform 200ms ${easeOut}, border-color 200ms ${easeOut}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          transition: `transform 160ms ${easeOut}, background-color 150ms ${easeOut}, color 150ms ${easeOut}, border-color 150ms ${easeOut}`,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 200 },
    },
  },
});
