import { Card, CardMedia, CardContent, CardActions, Link, Typography, Grid } from '@mui/material';

const Noticia = ({ noticia }) => {
    const { urlToImage, url, title, description, source } = noticia;

    return (
        <Grid item xs={12} lg={4} md={6}>
            <Card>
                <CardMedia
                    component="img"
                    height="250"
                    image={urlToImage || 'https://via.placeholder.com/250x150.png?text=Imagen+No+Disponibledata:image/jpeg;base64,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'} // Imagen por defecto
                    alt={`Imagen de la noticia ${title}`}
                />
                <CardContent>
                    <Typography variant="body1" color='error'>
                        {source.name}
                    </Typography>
                    <Typography variant="h5" component="div">
                        {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {description}
                    </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <Link href={url} target="_blank" rel="noopener" color='secondary' underline="none">
                        Leer más
                    </Link>
                </CardActions>
            </Card>
        </Grid>
    );
};

export default Noticia;
