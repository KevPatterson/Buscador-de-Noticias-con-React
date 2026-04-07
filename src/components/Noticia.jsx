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

const formatRelativeDate = (value) => {
    if (!value) return 'Sin fecha';

    const parsed = new Date(value).getTime();
    if (Number.isNaN(parsed)) return 'Sin fecha';

    const diffMin = Math.max(1, Math.floor((Date.now() - parsed) / 60000));
    if (diffMin < 60) return `${diffMin} min`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} h`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} d`;
};

const Noticia = ({ noticia, vista, index = 0, selectedNews = [], onToggleSelect }) => {
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
    const fechaRelativa = formatRelativeDate(noticia.pubDate);
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
                    className="list-news-item"
                    sx={{
                        display: 'flex',
                        alignItems: { xs: 'flex-start', md: 'center' },
                        gap: { xs: 1.2, md: 2 },
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        py: 1.35,
                        animationDelay: `${Math.min(index, 8) * 60}ms`,
                    }}
                >
                    <Typography className="news-list-order" component="span">
                        {String(index + 1).padStart(2, '0')}
                    </Typography>

                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ mb: 0.35, lineHeight: 1.2, pr: { md: 1.5 } }}>
                            <Link href={url} target="_blank" rel="noopener noreferrer" underline="hover" color="inherit">
                                {title}
                            </Link>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {source} · {fechaRelativa} · {fecha}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {fuenteCubana && (
                            <Chip
                                label="Fuente cubana"
                                size="small"
                                color="secondary"
                            />
                        )}

                        <Tooltip title="Copiar titular">
                            <IconButton color={copiado ? 'success' : 'default'} onClick={handleCopy}>
                                {copiado ? <CheckIcon /> : <ContentCopyIcon />}
                            </IconButton>
                        </Tooltip>

                        <Button
                            variant={isSelected ? 'contained' : 'outlined'}
                            color="primary"
                            size="small"
                            onClick={handleSelectClick}
                            sx={{ minWidth: 122 }}
                        >
                            {isSelected ? 'Seleccionada' : 'Seleccionar'}
                        </Button>
                    </Box>
                </Box>

                <Snackbar open={openSnack} autoHideDuration={2000} message="¡Copiado!" onClose={() => setOpenSnack(false)} />
            </Grid>
        );
    }

    return (
        <Grid item xs={12} sm={6} md={4} sx={{ perspective: '1200px' }}>
            <Card
                className="card-entrada"
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 1,
                    overflow: 'hidden',
                    animationDelay: `${Math.min(index, 8) * 60}ms`,
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'center center',
                    transition: 'transform 240ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 240ms cubic-bezier(0.23, 1, 0.32, 1)',
                    '@media (hover: hover)': {
                        '&:hover': {
                            transform: 'translateY(-6px) rotateX(2.5deg) rotateY(-3deg) scale(1.01)',
                            boxShadow: '0 22px 34px rgba(0, 0, 0, 0.38)',
                        },
                    },
                    '& .MuiCardMedia-root': {
                        transition: 'transform 260ms cubic-bezier(0.23, 1, 0.32, 1)',
                    },
                    '@media (hover: hover) and (pointer: fine)': {
                        '&:hover .MuiCardMedia-root': {
                            transform: 'translateZ(16px) scale(1.03)',
                        },
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
                        sx={{ aspectRatio: '16/9', objectFit: 'cover' }}
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
                            color: '#3e3830',
                            background: '#2e2a24',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography variant="h4" sx={{ fontStyle: 'italic', opacity: 0.55 }}>
                            {source}
                        </Typography>
                    </Box>
                )}

                <CardContent sx={{ flexGrow: 1, px: 2, pt: 1.2, pb: 0.6 }}>
                    <Typography variant="caption" color="text.secondary">
                        {source} · {fechaRelativa}
                    </Typography>
                    {fuenteCubana && (
                        <Chip
                            label="Fuente cubana"
                            size="small"
                            color="secondary"
                            sx={{ mt: 1, mb: 0.8, display: 'inline-flex' }}
                        />
                    )}
                    <Typography
                        variant="h6"
                        sx={{
                            mt: 0.4,
                            mb: 1.15,
                            textTransform: title.length <= 65 ? 'uppercase' : 'none',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {title.replace(/\*+/g, '').trim()}
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
                    <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.82 }}>
                        {fecha}
                    </Typography>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Link
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            color="primary.main"
                            underline="none"
                            sx={{ fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.75rem' }}
                        >
                            LEER →
                        </Link>
                        <Tooltip title="Copiar titular">
                            <IconButton color={copiado ? 'success' : 'default'} onClick={handleCopy}>
                                {copiado ? <CheckIcon /> : <ContentCopyIcon />}
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <Button
                        variant={isSelected ? 'contained' : 'outlined'}
                        color="primary"
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
