import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import { Button, Container, Typography } from '@mui/material';
import { saveAs } from 'file-saver';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, HeadingLevel, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import BreakingNewsBanner from './components/BreakingNewsBanner.jsx';
import FloatingCart from './components/FloatingCart.jsx';
import Formulario from './components/Formulario.jsx';
import Header from './components/Header.jsx';
import ListadoNoticias from './components/ListadoNoticias.jsx';
import { NOMBRES_FUENTES } from './config/fuentes';
import { FUENTES_INSTITUCIONALES, FUENTES_RSS, FUENTES_BUSQUEDA } from './config/fuentes-rss';
import useNoticias from './hooks/useNoticias.js';
import useRSS from './hooks/useRSS.js';
import useTendencias from './hooks/useTendencias.js';
import './styles.css';
import { extractArticle } from './services/extractArticle.js';
import cleanArticle from './services/cleanArticle.js';

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
  '©',
  'copyright',
  'información relacionada',
  'informacion relacionada',
  'comparte este artículo',
  'comparte este articulo',
  'compartir este artículo',
  'compartir este articulo',
  'ediciones prensa latina',
  'facebook',
  'twitter',
  'youtube',
  'rss',
  'telegram',
  'foto:',
  'hora:',
  'autor:',
  'etiquetas:',
  'redaccion central',
  'redacción central',
];

const DOCX_FONT = 'Arial';
const DOCX_BODY_SIZE = 24;
const DOCX_TITLE_SIZE = 32;

const createDocxTextRun = (text, { bold = false, italic = false, size = DOCX_BODY_SIZE, font = DOCX_FONT } = {}) =>
  new TextRun({
    text,
    bold,
    italic,
    size,
    font,
  });

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

// Limita cuantas extracciones simultaneas se lanzan contra /api/scrape. Sin
// limite, seleccionar decenas de noticias dispara todas las peticiones a la vez.
const mapConLimite = async (items = [], limite = 4, fn) => {
  const resultados = new Array(items.length);
  let siguiente = 0;

  const trabajador = async () => {
    for (;;) {
      const indice = siguiente;
      siguiente += 1;
      if (indice >= items.length) return;
      resultados[indice] = await fn(items[indice], indice);
    }
  };

  const cantidad = Math.min(Math.max(limite, 1), items.length);
  await Promise.all(Array.from({ length: cantidad }, () => trabajador()));
  return resultados;
};

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

// Genera resumenes con IA por lotes de 3 (opcional, solo si el usuario lo pide).
const agregarResumenes = async (lista) => {
  const items = [];
  let conResumen = 0;

  for (let i = 0; i < lista.length; i += 3) {
    const lote = lista.slice(i, i + 3);
    const resueltos = await Promise.all(
      lote.map(async (noticia) => {
        try {
          const respuesta = await fetch('/api/resumen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              titulo: noticia.title,
              texto: noticia.reportText || noticia.description || '',
            }),
          });

          if (!respuesta.ok) return noticia;
          const data = await respuesta.json();
          if (!data?.resumen) return noticia;

          conResumen += 1;
          return { ...noticia, resumen: data.resumen };
        } catch {
          return noticia;
        }
      })
    );
    items.push(...resueltos);
  }

  return { items, conResumen };
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
  const [extrayendo, setExtrayendo] = useState({});
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState('');
  const [incluirResumenes, setIncluirResumenes] = useState(false);
  const [tendenciasActivas, setTendenciasActivas] = useState(false);
  const sentinelRef = useRef(null);
  // Evita que dos clics seguidos sobre la misma tarjeta lancen extracciones
  // duplicadas o vuelvan a seleccionar lo que se acaba de quitar.
  const seleccionesEnCurso = useRef(new Set());

  const fuenteRSS = useMemo(
    () => FUENTES_RSS.find((fuente) => fuente.dominio === fuenteEspecifica) || null,
    [fuenteEspecifica]
  );

  const fuenteInstitucional = useMemo(
    () => FUENTES_INSTITUCIONALES.find((fuente) => fuente.dominio === fuenteEspecifica) || null,
    [fuenteEspecifica]
  );

  const fuenteBusqueda = useMemo(
    () => FUENTES_BUSQUEDA.find((fuente) => fuente.dominio === fuenteEspecifica) || null,
    [fuenteEspecifica]
  );

  const queryNewsData = fuenteInstitucional ? fuenteInstitucional.query : fuenteBusqueda ? fuenteBusqueda.query : query;
  const usarRSS = Boolean(fuenteRSS);
  const usarInstitucional = Boolean(fuenteInstitucional);
  const usarBusqueda = Boolean(fuenteBusqueda);

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
    claveFuente: fuenteEspecifica,
    fuenteEspecifica: usarRSS || usarInstitucional || usarBusqueda ? null : fuenteEspecifica,
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

  const {
    noticias: noticiasTendencias,
    loading: loadingTendencias,
    error: errorTendencias,
    refetch: refetchTendencias,
  } = useTendencias({ activo: tendenciasActivas, query: debouncedQuery });

  // La vista de tendencias GDELT se superpone al listado sin tocar sus hooks.
  const noticiasVisibles = tendenciasActivas ? noticiasTendencias : noticias;
  const loadingVisible = tendenciasActivas ? loadingTendencias : loading;
  const errorVisible = tendenciasActivas ? errorTendencias : error;
  const totalVisible = tendenciasActivas ? noticiasTendencias.length : totalResults;

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
        if (tendenciasActivas || !entry.isIntersecting || loading || isLoadingMoreActivo) return;
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
  }, [hasMoreActivo, isLoadingMoreActivo, loading, nextPageActivo, tendenciasActivas]);

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

  const toggleNewsSelection = async (newsItem) => {
    const itemKey = newsItem.link || newsItem.title;
    if (!itemKey) return;
    if (seleccionesEnCurso.current.has(itemKey)) return;

    const alreadySelected = selectedNews.some((item) => (item.link || item.title) === itemKey);
    if (alreadySelected) {
      setSelectedNews((current) => current.filter((item) => (item.link || item.title) !== itemKey));
      return;
    }

    // Marca la extraccion en curso y evita el doble clic antes de que React
    // aplique el cambio de estado.
    seleccionesEnCurso.current.add(itemKey);
    setExtrayendo((prev) => ({ ...prev, [itemKey]: true }));

    try {
      const { contenido, autor, extraido, titulo } = await extractArticle(newsItem.link, newsItem.description || '');

      const enriched = {
        ...newsItem,
        contenidoCompleto: contenido,
        autorExtraido: autor || '',
        _contenidoExtraido: Boolean(extraido),
        title: newsItem.title || titulo || newsItem.title,
      };

      setSelectedNews((prev) => {
        const exists = prev.some((item) => (item.link || item.title) === itemKey);
        if (exists) return prev;
        return [...prev, enriched];
      });
    } catch {
      // en fallo, añadir la noticia sin contenido extraido
      setSelectedNews((prev) => {
        const exists = prev.some((item) => (item.link || item.title) === itemKey);
        if (exists) return prev;
        return [...prev, { ...newsItem, contenidoCompleto: '', autorExtraido: '', _contenidoExtraido: false }];
      });
    } finally {
      seleccionesEnCurso.current.delete(itemKey);
      setExtrayendo((prev) => {
        const copy = { ...prev };
        delete copy[itemKey];
        return copy;
      });
    }
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
      'Información relacionada',
      'INFORMACIÓN RELACIONADA',
      'Informacion relacionada',
      'información relacionada',
      'informacion relacionada',
      'Historias Relacionadas',
      'Noticias Relacionadas',
      'noticias relacionadas',
      'Últimas entradas',
      'Ultimas entradas',
      'Latest stories',
      'Previous article',
      'Next article',
      'Comparte este artículo',
      'Comparte este articulo',
      'Compartir este artículo',
      'Compartir este articulo',
      '🔗 Comparte este artículo',
      'EDICIONES PRENSA LATINA',
      'Ediciones Prensa Latina',
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

    // Solo se recorta cuando el marcador aparece avanzado el texto: si es una
    // mencion temprana (navegacion o una frase del propio articulo) no debe
    // eliminar el cuerpo.
    if (cutIndex > 200) {
      text = text.slice(0, cutIndex);
    }

    const seen = new Set();
    const keptParagraphs = [];

    // Si el texto viene como un unico bloque sin saltos de parrafo, se divide
    // por oraciones para no entregar todo como un parrafo enorme.
    const tieneSaltos = /\n{2,}/.test(text);
    const bloques = tieneSaltos
      ? text.split(/\n{2,}/)
      : dividirOraciones(text);

    bloques.forEach((rawParagraph) => {
      const paragraph = cleanDocText(rawParagraph);
      if (!paragraph) return;

      // Descarta lineas de navegacion, redes sociales, fecha/hora y pie de pagina.
      if (/^fuente\s*:/i.test(paragraph)) return;
      if (/^(https?:\/\/|www\.)/i.test(paragraph)) return;
      if ((paragraph.match(/https?:\/\//gi) || []).length >= 2) return;
      if (/^\d{1,2}:\d{2}/.test(paragraph) && paragraph.length < 120) return;
      if (/^foto\s*:/i.test(paragraph)) return;
      if (/^hora\s*:/i.test(paragraph)) return;
      if (/^autor\s*:/i.test(paragraph)) return;
      if (/^etiquetas\s*:/i.test(paragraph)) return;
      if (/^image\s*\d*\s*:/i.test(paragraph)) return;
      if (/^segundos$/i.test(paragraph)) return;
      if (/^[-—]\s.*\(@[^)]+\).*\d{4}$/i.test(paragraph)) return;
      if (/pic\.twitter\.com\//i.test(paragraph)) return;
      if (/\bthe post\b/i.test(paragraph) && /\bappeared first on\b/i.test(paragraph)) return;
      if (paragraph.includes('Œ')) return;
      if (/^(facebook|twitter|youtube|rss|telegram)\s*$/i.test(paragraph)) return;
      if (/redaccion central/i.test(paragraph)) return;
      if (/comparte (este|este artículo|este articulo)/i.test(paragraph)) return;
      if (/ediciones prensa latina/i.test(paragraph)) return;

      const lower = paragraph.toLowerCase();
      if (DOC_BLOCKLIST.some((entry) => lower.includes(entry))) return;

      const key = normalizeForCompare(paragraph);
      if (!key || seen.has(key)) return;

      seen.add(key);
      keptParagraphs.push(paragraph);
    });

    return keptParagraphs.join('\n\n');
  };

  // Divide un texto bloque unico en parrafos por oraciones, para evitar
  // entregar todo el articulo como un unico parrafo enorme.
  const dividirOraciones = (texto = '') => {
    return texto
      .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ0-9"\¿¡])/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  };

  const isUsefulArticleText = (value = '') => {
    const text = cleanDocText(value);
    // Un articulo breve pero real (nota de radio, comunicado) es valido; el
    // umbral anterior de 220 caracteres lo sustituia por el resumen del feed.
    if (text.length < 120) return false;

    if ((text.match(/https?:\/\//gi) || []).length > 8) return false;
    if ((text.match(/<[^>]+>/g) || []).length > 0) return false;

    return true;
  };

  const pickFallbackText = (news) => {
    const candidates = [news.content, news.content_encoded, news.description, news.snippet]
      .map((item) => removeDocBoilerplate(item || ''))
      .filter(Boolean);

    if (candidates.length === 0) return 'Sin resumen disponible.';

    const nonPaywall = candidates.filter((value) => !/solo disponible en planes de pago/i.test(value));
    const source = nonPaywall.length > 0 ? nonPaywall : candidates;

    return source.sort((a, b) => b.length - a.length)[0];
  };

  const hasPendingExtraction = Object.keys(extrayendo).length > 0;

  const handleGenerateReport = async (newsList) => {
    if (!Array.isArray(newsList) || newsList.length === 0) return;
    if (hasPendingExtraction) return;

    setIsGeneratingReport(true);
    setReportError('');

    try {
      const enrichedNews = await mapConLimite(newsList, 4, async (news) => {
          const encodedUrl = encodeURIComponent(news.link || '');
          const fallbackText = pickFallbackText(news);

          // Si ya fue extraida al seleccionar, reutilizarla solo cuando el
          // texto es realmente util. Si la extraccion fallo (por un corte de
          // red temporal), el boletin reintenta antes de caer al resumen RSS.
          if (news.contenidoCompleto) {
            const scrapedText = removeDocBoilerplate(news.contenidoCompleto || '');
            const isCompleteText = isUsefulArticleText(scrapedText);
            if (isCompleteText) {
              return {
                ...news,
                reportText: scrapedText,
                scraped: true,
              };
            }
          }

          if (!encodedUrl) {
            return {
              ...news,
              reportText: fallbackText,
              scraped: false,
            };
          }

          try {
            // Extraccion de contenido completo via /api/scrape (cascada: JSON-LD,
            // selectores de dominio, Readability y heuristica).
            const response = await fetch(`${SCRAPE_API_BASE}/api/scrape?url=${encodedUrl}`);
            if (response.ok) {
              const payload = await response.json();
              const scrapedText = removeDocBoilerplate(payload?.cuerpo || '');
              const isCompleteText = isUsefulArticleText(scrapedText);
              if (isCompleteText) {
                return {
                  ...news,
                  reportText: scrapedText,
                  scraped: true,
                };
              }
            }

            return {
              ...news,
              reportText: fallbackText,
              scraped: false,
            };
          } catch {
            return {
              ...news,
              reportText: fallbackText,
              scraped: false,
            };
          }
        });

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

      let noticiasBoletin = filteredNews;
      if (incluirResumenes) {
        const resultado = await agregarResumenes(filteredNews);
        noticiasBoletin = resultado.items;
        if (resultado.conResumen === 0) {
          setReportError('No se pudieron generar resumenes; el boletin se genero sin ellos.');
        }
      }

      const children = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.TITLE,
          spacing: { after: 420 },
          children: [createDocxTextRun('Boletin de Noticias', { bold: true, size: 34 })],
        }),
      ];

      noticiasBoletin.forEach((news, index) => {
        const title = news.title || `Noticia ${index + 1}`;
        const content = cleanArticle(news.reportText || 'Sin contenido disponible.');
        const sourceUrl = news.link || 'Sin URL de fuente';

        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 140 },
            children: [createDocxTextRun(title, { bold: true, size: DOCX_TITLE_SIZE })],
          })
        );

        // El resumen generado se muestra en cursiva antes del cuerpo.
        if (news.resumen) {
          children.push(
            new Paragraph({
              spacing: { before: 40, after: 140 },
              children: [createDocxTextRun(news.resumen, { italic: true, size: DOCX_BODY_SIZE })],
            })
          );
        }

        content.split(/\n{2,}/).forEach((block) => {
          if (!block.trim()) return;
          children.push(
            new Paragraph({
              spacing: { before: 40, after: 120 },
              children: [createDocxTextRun(block.trim(), { size: DOCX_BODY_SIZE })],
            })
          );
        });

        children.push(
          new Paragraph({
            spacing: { before: 80, after: 280 },
            children: [
              createDocxTextRun('Fuente: ', { bold: true, size: DOCX_BODY_SIZE }),
              new TextRun({
                text: sourceUrl,
                style: 'Hyperlink',
                font: DOCX_FONT,
                size: DOCX_BODY_SIZE,
              }),
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

  const sourceLabel = tendenciasActivas
    ? 'GDELT'
    : usarRSS
      ? 'RSS DIRECTO'
      : fuenteEspecifica
        ? (NOMBRES_FUENTES[fuenteEspecifica] || fuenteEspecifica).toUpperCase()
        : 'NEWSDATA';

  return (
    <Box className="newsroom-page">
      <Header sourceLabel={sourceLabel} />
      <BreakingNewsBanner headlines={breakingHeadlines} />

      <Container maxWidth="lg" className="newsroom-main">
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Button
            variant={tendenciasActivas ? 'contained' : 'outlined'}
            color="secondary"
            size="small"
            onClick={() => setTendenciasActivas((valor) => !valor)}
            sx={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: '0.7rem',
              letterSpacing: '0.06em',
              textTransform: 'none',
            }}
          >
            {tendenciasActivas ? 'Volver a noticias' : 'Tendencias globales (24h)'}
          </Button>
        </Box>

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
            setQuery('');
            setFuenteEspecifica(nuevoDominio || null);
          }}
          onClearFuenteEspecifica={() => {
            setPagina('');
            setQuery('');
            setFuenteEspecifica(null);
          }}
        />
        </Box>

        <Box className="news-section">
        <ListadoNoticias
          noticias={noticiasVisibles}
          loading={loadingVisible}
          error={errorVisible}
          totalResults={totalVisible}
          onRetry={tendenciasActivas ? refetchTendencias : handleRetry}
          vista={vista}
          sentinelRef={sentinelRef}
          isLoadingMore={isLoadingMoreActivo}
          hasMore={tendenciasActivas ? false : hasMoreActivo}
          query={query}
          emptyMessage={tendenciasActivas ? 'No hay tendencias globales disponibles en este momento.' : mensajeSinResultados}
          errorMessage={tendenciasActivas ? 'No se pudieron obtener las tendencias globales. Intenta nuevamente.' : undefined}
          onSuggestionSearch={handleQuickSearch}
          onClearQuery={() => handleChangeQuery('')}
          fuenteActiva={tendenciasActivas ? 'gdelt' : usarRSS ? 'rss' : 'newsdata'}
          sectionTitle={tendenciasActivas ? 'Tendencias globales' : 'Ultimas Noticias'}
          selectedNews={selectedNews}
          onToggleSelect={toggleNewsSelection}
          extrayendo={extrayendo}
        />
        </Box>

        <FloatingCart
          selectedCount={selectedNews.length}
          isLoading={isGeneratingReport}
          hasPendingExtraction={hasPendingExtraction}
          incluirResumenes={incluirResumenes}
          onChangeIncluirResumenes={setIncluirResumenes}
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
