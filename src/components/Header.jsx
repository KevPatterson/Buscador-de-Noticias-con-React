/* eslint-disable react/prop-types */
import { Box, Typography } from '@mui/material';

const Header = ({ sourceLabel = 'NEWSDATA' }) => {
  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date())
    .toUpperCase();

  return (
    <Box component="header" className="newsroom-header">
      <Box className="newsroom-topbar">
        <Typography component="span" className="mono-meta">
          {fecha}
        </Typography>
        <Typography component="span" className="mono-meta mono-meta-right">
          FUENTE ACTIVA: {sourceLabel}
        </Typography>
      </Box>

      <Box className="newsroom-masthead">
        <Typography component="h1" className="newsroom-title">
          THE CUBA PRESS
        </Typography>

        <Box className="masthead-rule" />

        <Typography className="newsroom-subtitle">
          Buscador de Noticias · Edicion Digital
        </Typography>

        <Box className="masthead-double-rule">
          <Box className="masthead-double-rule-primary" />
          <Box className="masthead-double-rule-secondary" />
        </Box>
      </Box>
    </Box>
  );
};

export default Header;
