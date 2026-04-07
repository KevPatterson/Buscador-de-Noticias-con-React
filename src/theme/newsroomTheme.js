import { createTheme } from '@mui/material/styles';

export const newsroomTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0f0e0c',
      paper: '#1a1814',
    },
    primary: {
      main: '#e8c84a',
      contrastText: '#0f0e0c',
    },
    secondary: {
      main: '#c0392b',
      contrastText: '#ffffff',
    },
    text: {
      primary: '#f0ebe0',
      secondary: '#9a9080',
    },
    divider: '#2e2a24',
    error: { main: '#c0392b' },
    warning: { main: '#e8c84a' },
    success: { main: '#4a8c5c' },
  },
  typography: {
    fontFamily: '"Playfair Display", "Georgia", serif',
    h1: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 900,
      letterSpacing: '-0.02em',
      textTransform: 'uppercase',
    },
    h2: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 600,
    },
    body1: {
      fontFamily: '"Source Serif 4", "Georgia", serif',
      lineHeight: 1.75,
      fontSize: '0.97rem',
    },
    body2: {
      fontFamily: '"Source Serif 4", "Georgia", serif',
      lineHeight: 1.6,
      fontSize: '0.85rem',
      color: '#9a9080',
    },
    caption: {
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: '0.72rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    button: {
      fontFamily: '"IBM Plex Mono", monospace',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      fontWeight: 600,
    },
  },
  shape: { borderRadius: 2 },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,400&family=IBM+Plex+Mono:wght@400;600&display=swap');

        * { box-sizing: border-box; }

        body {
          background-color: #0f0e0c;
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%230f0e0c'/%3E%3Ccircle cx='1' cy='1' r='0.6' fill='%23ffffff08'/%3E%3C/svg%3E");
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f0e0c; }
        ::-webkit-scrollbar-thumb { background: #2e2a24; border-radius: 0; }
        ::-webkit-scrollbar-thumb:hover { background: #e8c84a; }

        ::selection { background: #e8c84a; color: #0f0e0c; }
      `,
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1814',
          border: '1px solid #2e2a24',
          borderRadius: 2,
          boxShadow: 'none',
          transition: 'border-color 0.2s ease-out, transform 0.2s ease-out',
          '&:hover': {
            borderColor: '#e8c84a',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '0.68rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          height: 24,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          padding: '8px 20px',
        },
        containedPrimary: {
          backgroundColor: '#e8c84a',
          color: '#0f0e0c',
          '&:hover': { backgroundColor: '#f5d55c' },
        },
        outlinedPrimary: {
          borderColor: '#e8c84a',
          color: '#e8c84a',
          '&:hover': {
            borderColor: '#f5d55c',
            backgroundColor: 'rgba(232, 200, 74, 0.07)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            fontFamily: '"Source Serif 4", serif',
            '& fieldset': { borderColor: '#2e2a24' },
            '&:hover fieldset': { borderColor: '#5a5040' },
            '&.Mui-focused fieldset': { borderColor: '#e8c84a' },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '0.78rem',
          letterSpacing: '0.06em',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#2e2a24' },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: { '& .MuiPaper-root': { borderRadius: 2 } },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'uppercase',
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          minHeight: 38,
          paddingInline: 12,
        },
      },
    },
  },
});
