/* eslint-disable react/prop-types */
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Noticia from './Noticia';

const SearchOffIcon = (props) => (
    <SvgIcon {...props}>
        <path d="M2.81 2.81 1.39 4.22l5 5A7 7 0 0 0 9 18a6.93 6.93 0 0 0 4.78-1.9l5 5 1.41-1.41zM9 4a5 5 0 0 1 5 5 4.94 4.94 0 0 1-1 3L7 6a4.94 4.94 0 0 1 2-2zM9 2a7 7 0 0 0-4.95 11.95l1.43-1.43A5 5 0 0 1 9 4a4.94 4.94 0 0 1 3.52 1.48l1.43-1.43A7 7 0 0 0 9 2z" />
    </SvgIcon>
);

const SkeletonCard = ({ vista }) => {
    if (vista === 'list') {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'transparent',
                }}
            >
                <Skeleton variant="text" width={48} sx={{ fontSize: 40, bgcolor: '#2e2a24', '&::after': { background: 'linear-gradient(90deg, transparent, rgba(232,200,74,0.06), transparent)' } }} />
                <Box sx={{ flexGrow: 1 }}>
                    <Skeleton variant="text" width="84%" sx={{ bgcolor: '#2e2a24', '&::after': { background: 'linear-gradient(90deg, transparent, rgba(232,200,74,0.06), transparent)' } }} />
                    <Skeleton variant="text" width="46%" sx={{ bgcolor: '#2e2a24', '&::after': { background: 'linear-gradient(90deg, transparent, rgba(232,200,74,0.06), transparent)' } }} />
                </Box>
                <Skeleton variant="rectangular" width={90} height={30} sx={{ bgcolor: '#2e2a24', borderRadius: 1, '&::after': { background: 'linear-gradient(90deg, transparent, rgba(232,200,74,0.06), transparent)' } }} />
            </Box>
        );
    }

    return (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.2, bgcolor: 'background.paper' }}>
            <Skeleton
                variant="rectangular"
                height={180}
                sx={{
                    borderRadius: 1,
                    bgcolor: '#2e2a24',
                    '&::after': {
                        background: 'linear-gradient(90deg, transparent, rgba(232,200,74,0.06), transparent)',
                    },
                }}
            />
            <Skeleton variant="text" width="45%" sx={{ mt: 1.4, bgcolor: '#2e2a24', '&::after': { background: 'linear-gradient(90deg, transparent, rgba(232,200,74,0.06), transparent)' } }} />
            <Skeleton variant="text" width="82%" sx={{ bgcolor: '#2e2a24', '&::after': { background: 'linear-gradient(90deg, transparent, rgba(232,200,74,0.06), transparent)' } }} />
            <Skeleton variant="text" width="74%" sx={{ bgcolor: '#2e2a24', '&::after': { background: 'linear-gradient(90deg, transparent, rgba(232,200,74,0.06), transparent)' } }} />
            <Skeleton variant="text" width="58%" sx={{ bgcolor: '#2e2a24', '&::after': { background: 'linear-gradient(90deg, transparent, rgba(232,200,74,0.06), transparent)' } }} />
        </Box>
    );
};

const ListadoNoticias = ({
    noticias,
    loading,
    error,
    totalResults,
    onRetry,
    vista,
    sentinelRef,
    hasMore,
    isLoadingMore,
    query,
    emptyMessage,
    fuenteActiva,
    onSuggestionSearch,
    onClearQuery,
    selectedNews,
    onToggleSelect,
}) => {
    const sourceChipConfig = {
        newsdata: {
            label: 'NewsData.io',
            color: 'primary',
            tooltip: '',
        },
        thenewsapi: {
            label: 'TheNewsAPI',
            color: 'warning',
            tooltip: 'NewsData.io sin creditos disponibles',
        },
        newsapi: {
            label: 'NewsAPI.org',
            color: 'warning',
            tooltip: 'NewsData.io y TheNewsAPI sin creditos disponibles',
        },
        rss: {
            label: 'RSS directo',
            color: 'error',
            tooltip: 'APIs sin creditos. Mostrando feeds RSS directos.',
        },
    };

    const chipInfo = sourceChipConfig[fuenteActiva] || sourceChipConfig.newsdata;
    const mostrarSkeletonInicial = loading && noticias.length === 0;
    const sinResultados = !loading && noticias.length === 0 && !error;

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Tooltip title={chipInfo.tooltip} disableHoverListener={!chipInfo.tooltip}>
                    <Chip label={chipInfo.label} color={chipInfo.color} size="small" />
                </Tooltip>
            </Box>

            <Typography textAlign="center" marginY={4} variant="h4" component="h2" color="secondary">
                <Box component="span" className="section-title">
                    Ultimas Noticias
                </Box>
            </Typography>

            {!error && totalResults > 0 && (
                <Typography textAlign="center" marginBottom={2} variant="body2" color="text.secondary">
                    {totalResults} resultados encontrados
                </Typography>
            )}

            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 3 }}
                    action={
                        <Button color="inherit" size="small" onClick={onRetry}>
                            Reintentar
                        </Button>
                    }
                >
                    Ocurrio un problema al consultar la API. Verifica tu API key o intenta nuevamente.
                </Alert>
            )}

            {mostrarSkeletonInicial && (
                <Grid container spacing={2}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Grid item xs={12} sm={vista === 'grid' ? 6 : 12} md={vista === 'grid' ? 4 : 12} key={index}>
                            <SkeletonCard vista={vista} />
                        </Grid>
                    ))}
                </Grid>
            )}

            {sinResultados && (
                <Box
                    sx={{
                        py: 7.5,
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'background.paper',
                    }}
                >
                    <SearchOffIcon sx={{ fontSize: 52, color: 'primary.main' }} />
                    <Typography variant="h4" sx={{ mt: 1.2, fontStyle: 'italic' }}>
                        [ Edicion sin noticias ]
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto', mt: 1.5 }}>
                        {emptyMessage || 'No encontramos articulos para tu busqueda en esta edicion.'}
                    </Typography>

                    <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {['Cuba', 'Tecnologia', 'Salud'].map((term) => (
                            <Chip
                                key={term}
                                label={term}
                                onClick={() => onSuggestionSearch?.(term)}
                                variant="outlined"
                                className="newsroom-quick-chip"
                            />
                        ))}
                    </Box>

                    {query.trim().length === 1 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Escribe al menos 2 caracteres para iniciar la busqueda.
                        </Typography>
                    )}

                    <Button variant="outlined" color="primary" sx={{ mt: 2.3 }} onClick={onClearQuery}>
                        Nueva busqueda
                    </Button>
                </Box>
            )}

            {noticias.length > 0 && (
                <Grid container spacing={2}>
                    {noticias.map((noticia, index) => (
                        <Noticia
                            key={`${noticia.link || noticia.title}-${index}`}
                            index={index}
                            noticia={noticia}
                            vista={vista}
                            selectedNews={selectedNews}
                            onToggleSelect={onToggleSelect}
                        />
                    ))}
                </Grid>
            )}

            <Box ref={sentinelRef} sx={{ height: 10 }} />

            {noticias.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, minHeight: 36 }}>
                    {isLoadingMore ? (
                        <CircularProgress size={22} />
                    ) : !hasMore ? (
                        <Typography variant="body2" color="text.secondary">
                            No hay mas noticias
                        </Typography>
                    ) : null}
                </Box>
            )}
        </>
    );
};

export default ListadoNoticias;
