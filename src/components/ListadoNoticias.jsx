import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import useNoticias from '../hooks/useNoticias'
import Noticia from './Noticia'
import { Grid2 } from '@mui/material'

const ListadoNoticias = () => {

    const {noticias} = useNoticias()

    return (
        <>
            <Typography textAlign='center' marginY={5} variant='h3' component='h2' color='secondary'>
                Últimas Noticias
            </Typography>

            <Grid2>
                {noticias.map(noticia => (
                    <Noticia
                    key={noticia.url}
                    noticia={noticia}
                    />
                ))}
            </Grid2>
        </>
    )
}

export default ListadoNoticias