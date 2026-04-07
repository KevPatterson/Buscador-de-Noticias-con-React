import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import App from './App.jsx';
import { newsroomTheme } from './theme/newsroomTheme.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={newsroomTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
