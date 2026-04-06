import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { Container, Typography } from '@mui/material';
import { saveAs } from 'file-saver';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, HeadingLevel, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import FloatingCart from './components/FloatingCart.jsx';
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
  { label: 'Cuba', value: 'Cuba' },
  { label: '💡 Energia Cuba', value: 'Energia Cuba' },
  { label: '💻 Tecnologia', value: 'Tecnologia' },
  { label: '🏥 Salud', value: 'Salud' },
  { label: '💰 Economia', value: 'Economia' },
  { label: '🌍 Internacional', value: 'Internacional' },
];

const HISTORIAL_KEY = 'historial_busquedas';
const VISTA_KEY = 'vista_preferida';
const FUENTE_KEY = 'fuente_preferida';
const SCRAPE_API_BASE = (import.meta.env.VITE_SCRAPE_API_BASE_URL || '').replace(/\/$/, '');

function App() {
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState('top');
  const [pais] = useState('cu');
  const [pagina, setPagina] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
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
  const [selectedNews, setSelectedNews] = useState([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState('');
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
  const usarInstitucional = Boolean(fuenteInstitucional);

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
    fuenteEspecifica: usarRSS || usarInstitucional ? null : fuenteEspecifica,
  });

  const {
    noticias: noticiasRSS,
    loading: loadingRSS,
    error: errorRSS,
    feedNoDisponible,
    feedMensaje,
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

  const toggleNewsSelection = (newsItem) => {
    const itemKey = newsItem.link || newsItem.title;
    if (!itemKey) return;

    setSelectedNews((current) => {
      const exists = current.some((item) => (item.link || item.title) === itemKey);
      if (exists) {
        return current.filter((item) => (item.link || item.title) !== itemKey);
      }

      return [...current, newsItem];
    });
  };

  const cleanDocText = (value = '') =>
    value
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const handleGenerateReport = async (newsList) => {
    if (!Array.isArray(newsList) || newsList.length === 0) return;

    setIsGeneratingReport(true);
    setReportError('');

    try {
      const enrichedNews = await Promise.all(
        newsList.map(async (news) => {
          const encodedUrl = encodeURIComponent(news.link || '');
          const fallbackText = cleanDocText(news.content || news.description || news.snippet || 'Sin resumen disponible.');

          if (!encodedUrl) {
            return {
              ...news,
              reportText: fallbackText,
              scraped: false,
            };
          }

          try {
            const response = await fetch(`${SCRAPE_API_BASE}/api/scrape?url=${encodedUrl}`);
            const contentType = response.headers.get('content-type') || '';
            if (!response.ok || !contentType.includes('application/json')) {
              throw new Error('Endpoint /api/scrape no disponible o respuesta invalida');
            }
            const payload = await response.json();
            const scrapedText = cleanDocText(payload?.fullText || '');
            const isCompleteText = scrapedText.length >= 220;

            return {
              ...news,
              reportText: isCompleteText ? scrapedText : fallbackText,
              scraped: isCompleteText,
            };
          } catch {
            return {
              ...news,
              reportText: fallbackText,
              scraped: false,
            };
          }
        })
      );

      const children = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.TITLE,
          spacing: { after: 420 },
          children: [new TextRun({ text: 'Boletin de Noticias', bold: true })],
        }),
      ];

      enrichedNews.forEach((news, index) => {
        const title = news.title || `Noticia ${index + 1}`;
        const content = news.reportText || 'Sin contenido disponible.';
        const sourceUrl = news.link || 'Sin URL de fuente';

        children.push(
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 140 },
          })
        );

        content.split(/\n{2,}/).forEach((block) => {
          if (!block.trim()) return;
          children.push(
            new Paragraph({
              text: block,
              spacing: { after: 140 },
            })
          );
        });

        children.push(
          new Paragraph({
            spacing: { after: 280 },
            children: [
              new TextRun({ text: 'Fuente: ', bold: true }),
              new TextRun({ text: sourceUrl, style: 'Hyperlink' }),
            ],
          })
        );
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'Boletin_Noticias.docx');
    } catch (error) {
      const message = error?.message || 'No se pudo generar el documento.';
      setReportError(message);
      console.error('Error al generar boletin:', error);
      alert('No se pudo generar el boletin de noticias. Intenta nuevamente.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const nombreFuenteSeleccionada = NOMBRES_FUENTES[fuenteEspecifica] || fuenteEspecifica;
  const mensajeSinResultados = usarRSS && feedNoDisponible
    ? `La fuente ${nombreFuenteSeleccionada} esta temporalmente no disponible. ${feedMensaje || 'Intenta mas tarde.'}`
    : fuenteEspecifica
      ? `No se encontraron noticias en ${nombreFuenteSeleccionada} para esta busqueda.`
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
        selectedNews={selectedNews}
        onToggleSelect={toggleNewsSelection}
      />

      <FloatingCart
        selectedCount={selectedNews.length}
        isLoading={isGeneratingReport}
        onGenerate={() => handleGenerateReport(selectedNews)}
      />

      <Snackbar open={Boolean(reportError)} autoHideDuration={3500} onClose={() => setReportError('')}>
        <Alert severity="error" onClose={() => setReportError('')} sx={{ width: '100%' }}>
          {reportError}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default App;
