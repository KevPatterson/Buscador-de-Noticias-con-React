/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardMedia,
    Chip,
    Grid,
    IconButton,
    Link,
    Snackbar,
    SvgIcon,
    Tooltip,
    Typography,
} from '@mui/material';

const ContentCopyIcon = (props) => (
    <SvgIcon {...props}>
        <path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12z" />
        <path d="M19 5H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11z" />
    </SvgIcon>
);

const CheckIcon = (props) => (
    <SvgIcon {...props}>
        <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
    </SvgIcon>
);

const formatDate = (value) => {
    if (!value) return 'Fecha no disponible';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible';

    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
};

const esFuenteCubana = (url) => {
    if (!url) return false;

    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return hostname.endsWith('.cu') || hostname === 'cu';
    } catch {
        return false;
    }
};
const HOSTS_IMAGEN_BLOQUEADOS = new Set(['media.cubadebate.cu', 'cuba.cu', 'www.cubahora.cu']);

const esImagenSegura = (imageUrl) => {
    if (!imageUrl) return false;

    try {
        const host = new URL(imageUrl).hostname;
        return !HOSTS_IMAGEN_BLOQUEADOS.has(host);
    } catch {
        return false;
    }
};

const Noticia = ({ noticia, vista, selectedNews = [], onToggleSelect }) => {
    const [copiado, setCopiado] = useState(false);
    const [openSnack, setOpenSnack] = useState(false);
    const [errorImagen, setErrorImagen] = useState(false);

    const title = noticia.title || 'Titular no disponible';
    const description = noticia.description || 'Sin descripcion disponible.';
    const source = noticia.source_id || 'Fuente desconocida';
    const url = noticia.link || '#';
    const imageUrl = noticia.image_url;
    const mostrarImagen = esImagenSegura(imageUrl) && !errorImagen;
    const fecha = formatDate(noticia.pubDate);
    const fuenteCubana = esFuenteCubana(url);
    const key = noticia.link || noticia.title;
    const isSelected = selectedNews.some((item) => (item.link || item.title) === key);

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

    const handleSelectClick = () => {
        if (!onToggleSelect) return;
        onToggleSelect(noticia);
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
                        borderRadius: 3,
                        p: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.74)',
                        transition: 'transform 180ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 220ms ease-out',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 12px 26px rgba(17, 44, 73, 0.11)',
                        },
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" sx={{ mb: 0.5, lineHeight: 1.2 }}>
                            <Link href={url} target="_blank" rel="noopener noreferrer" underline="hover" color="inherit">
                                {title}
                            </Link>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {source} - {fecha}
                        </Typography>
                        {fuenteCubana && (
                            <Chip
                                label="Fuente cubana"
                                size="small"
                                color="secondary"
                                sx={{ mt: 1 }}
                            />
                        )}
                    </Box>

                    <Tooltip title="Copiar titular">
                        <IconButton color={copiado ? 'success' : 'default'} onClick={handleCopy}>
                            {copiado ? <CheckIcon /> : <ContentCopyIcon />}
                        </IconButton>
                    </Tooltip>

                    <Button
                        variant={isSelected ? 'contained' : 'outlined'}
                        color="secondary"
                        size="small"
                        onClick={handleSelectClick}
                        sx={{ minWidth: 118 }}
                    >
                        {isSelected ? 'Seleccionada' : 'Seleccionar'}
                    </Button>
                </Box>

                <Snackbar open={openSnack} autoHideDuration={2000} message="¡Copiado!" onClose={() => setOpenSnack(false)} />
            </Grid>
        );
    }

    return (
        <Grid item xs={12} sm={6} md={4}>
            <Card
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    overflow: 'hidden',
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(252, 250, 244, 0.92) 100%)',
                    transition: 'transform 190ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 220ms ease-out',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 18px 34px rgba(17, 44, 73, 0.16)',
                    },
                }}
            >
                {mostrarImagen ? (
                    <CardMedia
                        component="img"
                        height="180"
                        image={imageUrl}
                        alt={`Imagen de la noticia ${title}`}
                        onError={() => setErrorImagen(true)}
                        sx={{ filter: 'saturate(1.04) contrast(1.03)' }}
                    />
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
                            background: 'linear-gradient(135deg, #133b5c 0%, #2f647f 100%)',
                        }}
                    >
                        <Typography variant="subtitle1">{source}</Typography>
                    </Box>
                )}

                <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        {source}
                    </Typography>
                    {fuenteCubana && (
                        <Chip
                            label="Fuente cubana"
                            size="small"
                            color="secondary"
                            sx={{ mt: 1, mb: 1, display: 'inline-flex' }}
                        />
                    )}
                    <Typography variant="h6" sx={{ mt: 0.5, mb: 1.5 }}>
                        {title}
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            mb: 1,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {fecha}
                    </Typography>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Link
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            color="secondary"
                            underline="none"
                            sx={{ fontWeight: 600 }}
                        >
                            Leer mas
                        </Link>
                        <Tooltip title="Copiar titular">
                            <IconButton color={copiado ? 'success' : 'default'} onClick={handleCopy}>
                                {copiado ? <CheckIcon /> : <ContentCopyIcon />}
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <Button
                        variant={isSelected ? 'contained' : 'outlined'}
                        color="secondary"
                        size="small"
                        onClick={handleSelectClick}
                    >
                        {isSelected ? 'Seleccionada' : 'Seleccionar'}
                    </Button>
                </CardActions>
            </Card>

            <Snackbar open={openSnack} autoHideDuration={2000} message="¡Copiado!" onClose={() => setOpenSnack(false)} />
        </Grid>
    );
};

export default Noticia;
