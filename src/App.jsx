import { Container, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import Formulario from './components/Formulario.jsx';
import ListadoNoticias from './components/ListadoNoticias.jsx';
import { NOMBRES_FUENTES } from './config/fuentes';
import { FUENTES_INSTITUCIONALES, FUENTES_RSS } from './config/fuentes-rss';
import useNoticias from './hooks/useNoticias.js';
import useRSS from './hooks/useRSS.js';
import './styles.css';

const CATEGORIAS = [
  { value: 'top', label: 'General' },
  { value: 'technology', label: 'Tecnologia' },
  { value: 'health', label: 'Salud' },
  { value: 'science', label: 'Ciencia' },
  { value: 'business', label: 'Negocios' },
  { value: 'politics', label: 'Politica' },
  { value: 'entertainment', label: 'Entretenimiento' },
  { value: 'sports', label: 'Deportes' },
];

const BUSQUEDAS_RAPIDAS = [
  { label: '🇨🇺 Cuba', value: 'Cuba' },
  { label: '💡 Energia Cuba', value: 'Energia Cuba' },
  { label: '💻 Tecnologia', value: 'Tecnologia' },
  { label: '🏥 Salud', value: 'Salud' },
  { label: '💰 Economia', value: 'Economia' },
  { label: '🌍 Internacional', value: 'Internacional' },
];

const HISTORIAL_KEY = 'historial_busquedas';
const VISTA_KEY = 'vista_preferida';
const FUENTE_KEY = 'fuente_preferida';

function App() {
  const [query, setQuery] = useState('Cuba');
  const [categoria, setCategoria] = useState('top');
  const [pais] = useState('cu');
  const [pagina, setPagina] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('Cuba');
  const [historial, setHistorial] = useState(() => {
    try {
      const guardado = localStorage.getItem(HISTORIAL_KEY);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });
  const [vista, setVista] = useState(() => localStorage.getItem(VISTA_KEY) || 'grid');
  const [fuenteEspecifica, setFuenteEspecifica] = useState(() => localStorage.getItem(FUENTE_KEY) || null);
  const sentinelRef = useRef(null);

  const fuenteRSS = useMemo(
    () => FUENTES_RSS.find((fuente) => fuente.dominio === fuenteEspecifica) || null,
    [fuenteEspecifica]
  );

  const fuenteInstitucional = useMemo(
    () => FUENTES_INSTITUCIONALES.find((fuente) => fuente.dominio === fuenteEspecifica) || null,
    [fuenteEspecifica]
  );

  const queryNewsData = fuenteInstitucional ? fuenteInstitucional.query : query;
  const usarRSS = Boolean(fuenteRSS);

  const {
    noticias: noticiasNewsData,
    loading: loadingNewsData,
    error: errorNewsData,
    totalResults: totalResultsNewsData,
    nextPage,
    hasMore,
    isLoadingMore,
    refetch: refetchNewsData,
  } = useNoticias({
    query: usarRSS ? '' : queryNewsData,
    categoria,
    pais,
    pagina,
    fuenteEspecifica: usarRSS ? null : fuenteEspecifica,
  });

  const {
    noticias: noticiasRSS,
    loading: loadingRSS,
    error: errorRSS,
    refetch: refetchRSS,
  } = useRSS({
    fuenteEspecifica,
    query,
  });

  const noticias = usarRSS ? noticiasRSS : noticiasNewsData;
  const loading = usarRSS ? loadingRSS : loadingNewsData;
  const error = usarRSS ? errorRSS : errorNewsData;
  const totalResults = usarRSS ? noticiasRSS.length : totalResultsNewsData;
  const nextPageActivo = usarRSS ? null : nextPage;
  const hasMoreActivo = usarRSS ? false : hasMore;
  const isLoadingMoreActivo = usarRSS ? false : isLoadingMore;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 2) return;

    setHistorial((actual) => {
      const limpio = [debouncedQuery, ...actual.filter((item) => item.toLowerCase() !== debouncedQuery.toLowerCase())].slice(0, 8);
      localStorage.setItem(HISTORIAL_KEY, JSON.stringify(limpio));
      return limpio;
    });
  }, [debouncedQuery]);

  useEffect(() => {
    localStorage.setItem(VISTA_KEY, vista);
  }, [vista]);

  useEffect(() => {
    if (fuenteEspecifica) {
      localStorage.setItem(FUENTE_KEY, fuenteEspecifica);
      return;
    }

    localStorage.removeItem(FUENTE_KEY);
  }, [fuenteEspecifica]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting || loading || isLoadingMoreActivo) return;
        if (!hasMoreActivo || !nextPageActivo) return;
        setPagina(nextPageActivo);
      },
      { threshold: 0.1 }
    );

    const node = sentinelRef.current;
    if (node) observer.observe(node);

    return () => {
      if (node) observer.unobserve(node);
      observer.disconnect();
    };
  }, [hasMoreActivo, isLoadingMoreActivo, loading, nextPageActivo]);

  const chipActivo = useMemo(
    () => BUSQUEDAS_RAPIDAS.find((item) => item.value.toLowerCase() === query.trim().toLowerCase())?.value || '',
    [query]
  );

  const handleChangeQuery = (valor) => {
    setPagina('');
    setQuery(valor);
  };

  const handleQuickSearch = (valor) => {
    setPagina('');
    setQuery(valor);
  };

  const handleSelectHistorial = (valor) => {
    setPagina('');
    setQuery(valor);
  };

  const handleChangeCategoria = (event, nuevaCategoria) => {
    if (!nuevaCategoria) return;
    setPagina('');
    setCategoria(nuevaCategoria);
  };

  const handleRetry = () => {
    if (usarRSS) {
      refetchRSS();
      return;
    }

    refetchNewsData();
  };

  const mensajeSinResultados = fuenteEspecifica
    ? `No se encontraron noticias en ${NOMBRES_FUENTES[fuenteEspecifica] || fuenteEspecifica} para esta busqueda.`
    : undefined;

  return (
    <Container maxWidth="lg" sx={{ pb: 5 }}>
      <header>
        <Typography align="center" marginY={4} component="h1" variant="h3" color="secondary">
          Buscador de Noticias
        </Typography>
      </header>

      <Formulario
        query={query}
        onChangeQuery={handleChangeQuery}
        onClearQuery={() => handleChangeQuery('')}
        busquedasRapidas={BUSQUEDAS_RAPIDAS}
        chipActivo={chipActivo}
        onQuickSearch={handleQuickSearch}
        categorias={CATEGORIAS}
        categoria={categoria}
        onChangeCategoria={handleChangeCategoria}
        historial={historial}
        onSelectHistorial={handleSelectHistorial}
        onClearHistorial={() => {
          setHistorial([]);
          localStorage.setItem(HISTORIAL_KEY, JSON.stringify([]));
        }}
        vista={vista}
        onChangeVista={setVista}
        fuenteEspecifica={fuenteEspecifica}
        onChangeFuenteEspecifica={(nuevoDominio) => {
          setPagina('');
          setFuenteEspecifica(nuevoDominio || null);
        }}
        onClearFuenteEspecifica={() => {
          setPagina('');
          setFuenteEspecifica(null);
        }}
      />

      <ListadoNoticias
        noticias={noticias}
        loading={loading}
        error={error}
        totalResults={totalResults}
        onRetry={handleRetry}
        vista={vista}
        sentinelRef={sentinelRef}
        isLoadingMore={isLoadingMoreActivo}
        hasMore={hasMoreActivo}
        query={query}
        emptyMessage={mensajeSinResultados}
      />
    </Container>
  );
}

export default App;
