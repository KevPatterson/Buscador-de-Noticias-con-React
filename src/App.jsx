import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import { Container, Typography } from '@mui/material';
import { saveAs } from 'file-saver';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, HeadingLevel, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import BreakingNewsBanner from './components/BreakingNewsBanner.jsx';
import FloatingCart from './components/FloatingCart.jsx';
import Formulario from './components/Formulario.jsx';
import Header from './components/Header.jsx';
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
const DEFAULT_REPORT_BLOCKED_DOMAINS = ['news.google.com'];
const REPORT_BLOCKED_DOMAINS = [
  ...DEFAULT_REPORT_BLOCKED_DOMAINS,
  ...(import.meta.env.VITE_REPORT_BLOCKED_DOMAINS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
];
const DOC_BLOCKLIST = [
  'do not process my personal information',
  'personal data processing opt outs',
  'i want to opt-out',
  'resumen de audio (generado por ia)',
  'published time:',
  'tiempo de lectura aprox',
  'ultimas entradas',
  'últimas entradas',
  'historias relacionadas',
  'latest stories',
  'previous article',
  'next article',
  'menu',
  'menú',
  'loaderchats',
  'do not process my data',
  'all rights reserved',
  'todos los derechos reservados',
  'do not sell my data',
  'we use cookies',
  'gracias por compartir',
  'solo disponible en planes de pago',
  'acceder al contenido multimedia',
  'pic.twitter.com/',
  'the post ',
  'appeared first on',
];

const normalizeForCompare = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .trim();

const canonicalizeTitle = (value = '') =>
  normalizeForCompare(value)
    .replace(/\b(fotos?|foto|video|informe|actualizacion|actualización|post)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getHostname = (value = '') => {
  if (!value) return '';

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const isBlockedReportDomain = (url = '') => {
  const host = getHostname(url);
  if (!host) return false;

  return REPORT_BLOCKED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
};

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

  const decodeHtmlEntities = (value = '') => {
    try {
      const parser = new DOMParser();
      let current = value;

      for (let i = 0; i < 3; i += 1) {
        const doc = parser.parseFromString(current, 'text/html');
        const decoded = doc.documentElement.textContent || current;
        if (decoded === current) break;
        current = decoded;
      }

      return current;
    } catch {
      return value;
    }
  };

  const stripMarkup = (value = '') =>
    value
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
      .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ');

  const removeDocBoilerplate = (value = '') => {
    let text = cleanDocText(decodeHtmlEntities(stripMarkup(value)));

    const cutMarkers = [
      'Ultimas entradas',
      'Últimas entradas',
      'Historias Relacionadas',
      'Latest stories',
      'Previous article',
      'Next article',
      'All Rights Reserved',
      'Todos los derechos reservados',
      'Do Not Sell My Data',
      'We use cookies',
      'Gracias por compartir',
    ];

    let cutIndex = -1;
    cutMarkers.forEach((marker) => {
      const index = text.toLowerCase().indexOf(marker.toLowerCase());
      if (index > 0 && (cutIndex < 0 || index < cutIndex)) {
        cutIndex = index;
      }
    });

    if (cutIndex > 0) {
      text = text.slice(0, cutIndex);
    }

    const seen = new Set();
    const keptParagraphs = [];

    text.split(/\n{2,}/).forEach((rawParagraph) => {
      const paragraph = cleanDocText(rawParagraph);
      if (!paragraph) return;

      if (/^fuente\s*:/i.test(paragraph)) return;
      if (/^(https?:\/\/|www\.)/i.test(paragraph)) return;
      if ((paragraph.match(/https?:\/\//gi) || []).length >= 2) return;
      if (/^\d{1,2}:\d{2}/.test(paragraph) && paragraph.length < 120) return;
      if (/^foto\s*:/i.test(paragraph)) return;
      if (/^image\s*\d*\s*:/i.test(paragraph)) return;
      if (/^segundos$/i.test(paragraph)) return;
      if (/^[-—]\s.*\(@[^)]+\).*\d{4}$/i.test(paragraph)) return;
      if (/pic\.twitter\.com\//i.test(paragraph)) return;
      if (/\bthe post\b/i.test(paragraph) && /\bappeared first on\b/i.test(paragraph)) return;
      if (paragraph.includes('Œ')) return;

      const lower = paragraph.toLowerCase();
      if (DOC_BLOCKLIST.some((entry) => lower.includes(entry))) return;

      const key = normalizeForCompare(paragraph);
      if (!key || seen.has(key)) return;

      seen.add(key);
      keptParagraphs.push(paragraph);
    });

    return keptParagraphs.join('\n\n');
  };

  const isUsefulArticleText = (value = '') => {
    const text = cleanDocText(value);
    if (text.length < 220) return false;

    const lower = text.toLowerCase();
    if (DOC_BLOCKLIST.some((entry) => lower.includes(entry))) return false;

    if ((text.match(/https?:\/\//gi) || []).length > 8) return false;
    if ((text.match(/<[^>]+>/g) || []).length > 0) return false;

    return true;
  };

  const pickFallbackText = (news) => {
    const candidates = [news.content, news.description, news.snippet]
      .map((item) => removeDocBoilerplate(item || ''))
      .filter(Boolean);

    if (candidates.length === 0) return 'Sin resumen disponible.';

    const nonPaywall = candidates.filter((value) => !/solo disponible en planes de pago/i.test(value));
    const source = nonPaywall.length > 0 ? nonPaywall : candidates;

    return source.sort((a, b) => b.length - a.length)[0];
  };

  const handleGenerateReport = async (newsList) => {
    if (!Array.isArray(newsList) || newsList.length === 0) return;

    setIsGeneratingReport(true);
    setReportError('');

    try {
      const enrichedNews = await Promise.all(
        newsList.map(async (news) => {
          const encodedUrl = encodeURIComponent(news.link || '');
          const fallbackText = pickFallbackText(news);

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
            const scrapedText = removeDocBoilerplate(payload?.fullText || '');
            const isCompleteText = isUsefulArticleText(scrapedText);

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

      const uniqueNews = [];
      const seenKeys = new Set();

      enrichedNews.forEach((news) => {
        const cleanTitle = cleanDocText(decodeHtmlEntities(stripMarkup(news.title || '')));
        const normalizedTitle = canonicalizeTitle(cleanTitle);
        const normalizedBodyHead = normalizeForCompare((news.reportText || '').slice(0, 260));
        const dedupeKey = `${normalizedTitle}|${normalizedBodyHead}`;

        if (!normalizedTitle) return;
        if (seenKeys.has(dedupeKey)) return;

        seenKeys.add(dedupeKey);
        uniqueNews.push({
          ...news,
          title: cleanTitle || news.title,
        });
      });

      const filteredNews = uniqueNews.filter((news) => !isBlockedReportDomain(news.link || ''));

      if (filteredNews.length === 0) {
        throw new Error('Todas las noticias seleccionadas pertenecen a dominios excluidos del boletin.');
      }

      const children = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.TITLE,
          spacing: { after: 420 },
          children: [new TextRun({ text: 'Boletin de Noticias', bold: true })],
        }),
      ];

      filteredNews.forEach((news, index) => {
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

  const breakingHeadlines = useMemo(() => {
    const now = Date.now();
    return noticias
      .filter((item) => {
        const time = new Date(item?.pubDate || '').getTime();
        if (Number.isNaN(time)) return false;
        return now - time <= 2 * 60 * 60 * 1000;
      })
      .map((item) => item?.title)
      .filter(Boolean)
      .slice(0, 6);
  }, [noticias]);

  const sourceLabel = usarRSS
    ? 'RSS DIRECTO'
    : fuenteEspecifica
      ? (NOMBRES_FUENTES[fuenteEspecifica] || fuenteEspecifica).toUpperCase()
      : 'NEWSDATA';

  return (
    <Box className="newsroom-page">
      <Header sourceLabel={sourceLabel} />
      <BreakingNewsBanner headlines={breakingHeadlines} />

      <Container maxWidth="lg" className="newsroom-main">
        <Box className="search-strip">
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
        </Box>

        <Box className="news-section">
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
          onSuggestionSearch={handleQuickSearch}
          onClearQuery={() => handleChangeQuery('')}
          fuenteActiva={usarRSS ? 'rss' : 'newsdata'}
          selectedNews={selectedNews}
          onToggleSelect={toggleNewsSelection}
        />
        </Box>

        <FloatingCart
          selectedCount={selectedNews.length}
          isLoading={isGeneratingReport}
          onGenerate={() => handleGenerateReport(selectedNews)}
          onClearSelection={() => setSelectedNews([])}
        />

        <Snackbar open={Boolean(reportError)} autoHideDuration={3500} onClose={() => setReportError('')}>
          <Alert severity="error" onClose={() => setReportError('')} sx={{ width: '100%' }}>
            {reportError}
          </Alert>
        </Snackbar>
      </Container>

      <Box component="footer" className="newsroom-footer">
        <Box className="masthead-double-rule newsroom-footer-rule">
          <Box className="masthead-double-rule-primary" />
          <Box className="masthead-double-rule-secondary" />
        </Box>

        <Divider sx={{ mb: 1.2 }} />

        <Typography className="footer-meta">CUBAPRESS · Edicion Digital · © 2026</Typography>
        <Typography className="footer-meta">Desarrollado por Clavisoft · clavisoft.vercel.app</Typography>
        <Typography className="footer-meta">Fuentes: NewsData.io · TheNewsAPI · RSS Directo</Typography>

        <Divider sx={{ mt: 1.2 }} />
      </Box>
    </Box>
  );
}

export default App;
