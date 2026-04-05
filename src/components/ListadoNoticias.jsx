import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import Noticia from './Noticia';

const SkeletonCard = ({ vista }) => {
    if (vista === 'list') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, p: 2, border: '1px solid #eee', borderRadius: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                </Box>
                <Skeleton variant="circular" width={36} height={36} />
            </Box>
        );
    }

    return (
        <Box sx={{ border: '1px solid #eee', borderRadius: 3, p: 1.5 }}>
            <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            <Skeleton variant="text" width="80%" sx={{ mt: 2 }} />
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
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
}) => {
    const mostrarSkeletonInicial = loading && noticias.length === 0;
    const sinResultados = !loading && noticias.length === 0 && !error;

    return (
        <>
            <Typography textAlign="center" marginY={4} variant="h4" component="h2" color="secondary">
                Ultimas Noticias
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
                <Box sx={{ py: 7, textAlign: 'center' }}>
                    <SearchOffIcon sx={{ fontSize: 56, color: 'text.secondary' }} />
                    <Typography variant="h6" sx={{ mt: 1 }}>
                        No encontramos noticias para esa busqueda.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Prueba con terminos mas especificos, por ejemplo: Cuba energia, IA en salud, economia global.
                    </Typography>
                    {query.trim().length < 2 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Escribe al menos 2 caracteres para iniciar la busqueda.
                        </Typography>
                    )}
                </Box>
            )}

            {noticias.length > 0 && (
                <Grid container spacing={2}>
                    {noticias.map((noticia, index) => (
                        <Noticia key={`${noticia.link || noticia.title}-${index}`} noticia={noticia} vista={vista} />
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
