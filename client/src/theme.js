import { createTheme } from '@mui/material/styles';

const easeOut = 'cubic-bezier(0.23, 1, 0.32, 1)';
const easeInOut = 'cubic-bezier(0.77, 0, 0.175, 1)';

export const theme = createTheme({
  shape: { borderRadius: 10 },
  palette: {
    primary: { main: '#4f46e5' },
    background: { default: '#f7f7f9' },
  },
  typography: {
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
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
    MuiAppBar: {
      defaultProps: { color: 'inherit' },
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          backgroundColor: '#ffffff',
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
    MuiCard: {
      styleOverrides: {
        root: {
          transition: `box-shadow 200ms ${easeOut}, transform 200ms ${easeOut}`,
        },
      },
    },
  },
});
