/* eslint-disable react/prop-types */
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';
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

const CloseIcon = (props) => (
  <SvgIcon {...props}>
    <path d="m18.3 5.71-1.41-1.41L12 9.17 7.11 4.3 5.7 5.71 10.59 10.6 5.7 15.49l1.41 1.41L12 12.01l4.89 4.89 1.41-1.41-4.89-4.89z" />
  </SvgIcon>
);

const FloatingCart = ({ selectedCount, isLoading, onGenerate, onClearSelection }) => {
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
        py: 1.55,
        borderRadius: 4,
        minWidth: { xs: 260, sm: 310 },
        border: '1px solid rgba(18, 38, 58, 0.12)',
        background: 'linear-gradient(130deg, rgba(255, 253, 248, 0.95) 0%, rgba(237, 244, 248, 0.95) 100%)',
        backdropFilter: 'blur(8px)',
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            onClick={onGenerate}
            disabled={isLoading || selectedCount === 0}
            sx={{ whiteSpace: 'nowrap', px: 1.8 }}
          >
            {isLoading ? 'Generando...' : 'Generar Boletin en Word'}
          </Button>

          <Tooltip title="Descartar seleccionadas">
            <span>
              <IconButton
                color="error"
                aria-label="Descartar todas las noticias seleccionadas"
                onClick={onClearSelection}
                disabled={isLoading || selectedCount === 0}
                size="small"
                sx={{ border: '1px solid', borderColor: 'rgba(200, 85, 61, 0.35)' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
};

export default FloatingCart;
