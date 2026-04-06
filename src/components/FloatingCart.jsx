/* eslint-disable react/prop-types */
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';

const ArticleIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm2 3v2h10V7zm0 4v2h10v-2zm0 4v2h7v-2z" />
  </SvgIcon>
);

const DownloadIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M11 3h2v8h3l-4 4-4-4h3zM5 19h14v2H5z" />
  </SvgIcon>
);

const FloatingCart = ({ selectedCount, isLoading, onGenerate }) => {
  if (selectedCount <= 0) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        right: { xs: 12, sm: 24 },
        bottom: { xs: 12, sm: 24 },
        zIndex: 1200,
        px: 2,
        py: 1.5,
        borderRadius: 3,
        minWidth: { xs: 260, sm: 310 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={selectedCount} color="secondary" max={99}>
            <ArticleIcon />
          </Badge>
          <Typography variant="body2" color="text.secondary">
            Noticias seleccionadas
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="secondary"
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
          onClick={onGenerate}
          disabled={isLoading || selectedCount === 0}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {isLoading ? 'Generando...' : 'Generar Boletin en Word'}
        </Button>
      </Box>
    </Paper>
  );
};

export default FloatingCart;
