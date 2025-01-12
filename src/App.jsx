import {Container, Typography} from '@mui/material'
import Grid from '@mui/material/Grid';
import Formulario from './components/Formulario.jsx'
import { NoticiasProvider } from './context/NoticiasProvider.jsx';
import ListadoNoticias from './components/ListadoNoticias.jsx';
import './styles.css';

function App() {

  return (
    <NoticiasProvider>
      <Container>
        <header>
          <Typography align='center' marginY={5} component='h1' variant='h3' color='secondary'>
          Buscador de Noticias
          </Typography>
        </header>

        <Grid container direction="row" justifyContent="center" alignItems="center">
          <Grid item md={6} xs={12} lg={4}>
            <Formulario />
          </Grid>
        </Grid>

        <ListadoNoticias />

      </Container>
    </NoticiasProvider>
  )
}

export default App
