import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Card,
    CardActions,
    CardContent,
    CardMedia,
    Grid,
    IconButton,
    Link,
    Snackbar,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

const formatDate = (value) => {
    if (!value) return 'Fecha no disponible';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible';

    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
};

const Noticia = ({ noticia, vista }) => {
    const [copiado, setCopiado] = useState(false);
    const [openSnack, setOpenSnack] = useState(false);

    const title = noticia.title || 'Titular no disponible';
    const description = noticia.description || 'Sin descripcion disponible.';
    const source = noticia.source_id || 'Fuente desconocida';
    const url = noticia.link || '#';
    const imageUrl = noticia.image_url;
    const fecha = formatDate(noticia.pubDate);

    useEffect(() => {
        if (!copiado) return;
        const timer = setTimeout(() => setCopiado(false), 2000);
        return () => clearTimeout(timer);
    }, [copiado]);

    const textoCopiar = useMemo(() => `${title} - ${source} - ${url}`, [source, title, url]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(textoCopiar);
            setCopiado(true);
            setOpenSnack(true);
        } catch {
            setOpenSnack(false);
        }
    };

    if (vista === 'list') {
        return (
            <Grid item xs={12}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 2,
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" sx={{ mb: 0.5 }}>
                            <Link href={url} target="_blank" rel="noopener noreferrer" underline="hover" color="inherit">
                                {title}
                            </Link>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {source} - {fecha}
                        </Typography>
                    </Box>

                    <Tooltip title="Copiar titular">
                        <IconButton color={copiado ? 'success' : 'default'} onClick={handleCopy}>
                            {copiado ? <CheckIcon /> : <ContentCopyIcon />}
                        </IconButton>
                    </Tooltip>
                </Box>

                <Snackbar open={openSnack} autoHideDuration={2000} message="¡Copiado!" onClose={() => setOpenSnack(false)} />
            </Grid>
        );
    }

    return (
        <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {imageUrl ? (
                    <CardMedia component="img" height="180" image={imageUrl} alt={`Imagen de la noticia ${title}`} />
                ) : (
                    <Box
                        sx={{
                            height: 180,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            px: 2,
                            textAlign: 'center',
                            color: 'white',
                            background: 'linear-gradient(135deg, #263238 0%, #546e7a 100%)',
                        }}
                    >
                        <Typography variant="subtitle1">{source}</Typography>
                    </Box>
                )}

                <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        {source}
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, mb: 1.5 }}>
                        {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {fecha}
                    </Typography>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Link href={url} target="_blank" rel="noopener noreferrer" color="secondary" underline="none">
                        Leer mas
                    </Link>
                    <Tooltip title="Copiar titular">
                        <IconButton color={copiado ? 'success' : 'default'} onClick={handleCopy}>
                            {copiado ? <CheckIcon /> : <ContentCopyIcon />}
                        </IconButton>
                    </Tooltip>
                </CardActions>
            </Card>

            <Snackbar open={openSnack} autoHideDuration={2000} message="¡Copiado!" onClose={() => setOpenSnack(false)} />
        </Grid>
    );
};

export default Noticia;
