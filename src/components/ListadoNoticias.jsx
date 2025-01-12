import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import useNoticias from '../hooks/useNoticias';
import Noticia from './Noticia';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';

const ListadoNoticias = () => {
    const { noticias, totalNoticias, handleChangePagina, pagina, loading } = useNoticias(); // Asegúrate de tener la variable 'loading'

    const totalPaginas = Math.ceil(totalNoticias / 20);

    return (
        <>
            <Typography textAlign='center' marginY={5} variant='h3' component='h2' color='secondary'>
                Últimas Noticias
            </Typography>

            {loading ? ( // Si está cargando, muestra un spinner
                <div className="spinner-container">
                    <div className="sk-chase">
                        <div className="sk-chase-dot"></div>
                        <div className="sk-chase-dot"></div>
                        <div className="sk-chase-dot"></div>
                        <div className="sk-chase-dot"></div>
                        <div className="sk-chase-dot"></div>
                        <div className="sk-chase-dot"></div>
                    </div>
                </div> 
            ) : (
                <Grid container spacing={2}>
                    {noticias.map((noticia) => (
                        <Noticia key={noticia.url} noticia={noticia} />
                    ))}
                </Grid>
            )}

            <Stack spacing={2} direction='row' justifyContent='center' alignItems='center' marginTop={5}>
                <Pagination
                    count={totalPaginas}
                    color='secondary'
                    onChange={handleChangePagina}
                    page={pagina}
                />
            </Stack>
        </>
    );
};

export default ListadoNoticias;
