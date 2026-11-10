/**
 * Extrae el contenido de un articulo.
 *
 * Flujo (puntos 2.1 y 2.5):
 * 1. Si el description del RSS (incluyendo content:encoded) tiene mas de ~500
 *    caracteres limpios, se usa directamente sin scrapeo.
 * 2. Se consulta /api/scrape con la cascada JSON-LD > selectores de dominio >
 *    Readability > heuristica.
 * 3. Si nada valida, se devuelve el description del RSS con calidad "baja".
 */
import cleanArticle from './cleanArticle.js';

const LIMITE_CONTENIDO_RSS = 500;

export const extractArticle = async (url, descriptionFallback = '') => {
  const limpioFallback = limpiarDescripcionRSS(descriptionFallback);

  if (limpioFallback.length >= LIMITE_CONTENIDO_RSS) {
    return {
      contenido: cleanArticle(limpioFallback),
      autor: '',
      titulo: '',
      fecha: '',
      imagen: '',
      urlCanonica: '',
      metodo: 'rss',
      calidad: 'alta',
      extraido: false,
      sinScrapeo: true,
    };
  }

  try {
    const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const data = await res.json();
      const cuerpo = data && data.cuerpo ? String(data.cuerpo) : '';
      if (cuerpo.trim().length > 80) {
        return {
          contenido: cleanArticle(cuerpo),
          autor: data.autor || '',
          titulo: data.titulo || '',
          fecha: data.fecha || '',
          imagen: data.imagen || '',
          urlCanonica: data.urlCanonica || '',
          metodo: data.metodo || '',
          calidad: data.calidad || 'baja',
          extraido: true,
        };
      }
    }

    return {
      contenido: cleanArticle(limpioFallback),
      autor: '',
      titulo: '',
      fecha: '',
      imagen: '',
      urlCanonica: '',
      metodo: 'rss-fallback',
      calidad: 'baja',
      extraido: false,
    };
  } catch (e) {
    return {
      contenido: cleanArticle(limpioFallback),
      autor: '',
      titulo: '',
      fecha: '',
      imagen: '',
      urlCanonica: '',
      metodo: 'rss-fallback',
      calidad: 'baja',
      extraido: false,
    };
  }
};

const limpiarDescripcionRSS = (description) => {
  if (!description) return "";
  return description
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
};
