import { fetchNewsData } from './newsdata';
import { fetchNewsAPI } from './newsapi';
import { fetchRSSFallback } from './rss';
import { fetchTheNewsAPI } from './thenewsapi';

const NEWSDATA_BLOQUEADO_KEY = 'newsdata_bloqueado_hasta';
const THENEWSAPI_BLOQUEADO_KEY = 'thenewsapi_bloqueado_hasta';
const NEWSAPI_BLOQUEADO_KEY = 'newsapi_bloqueado_hasta';
const BLOQUEO_DURACION_MS = 60 * 60 * 1000;

const estaBloqueado = (key) => {
  const hasta = localStorage.getItem(key);
  if (!hasta) return false;

  return Date.now() < Number.parseInt(hasta, 10);
};

const bloquearPor1Hora = (key) => {
  localStorage.setItem(key, String(Date.now() + BLOQUEO_DURACION_MS));
};

const tieneResultados = (resultados) => Array.isArray(resultados) && resultados.length > 0;

export const fetchConFallback = async (params) => {
  const newsDataKey = import.meta.env.VITE_NEWSDATA_API_KEY;
  const theNewsApiKey = import.meta.env.VITE_THENEWSAPI_KEY;
  const newsApiKey = import.meta.env.VITE_NEWSAPI_KEY;

  if (newsDataKey && !estaBloqueado(NEWSDATA_BLOQUEADO_KEY)) {
    try {
      const { resultados, nextPage, totalResults } = await fetchNewsData(params);
      if (tieneResultados(resultados)) {
        return { resultados, fuente: 'newsdata', nextPage, totalResults };
      }
    } catch (err) {
      if (err.message === 'QUOTA_EXCEEDED') {
        bloquearPor1Hora(NEWSDATA_BLOQUEADO_KEY);
        console.warn('NewsData.io sin creditos. Cambiando a TheNewsAPI...');
      } else {
        throw err;
      }
    }
  }

  if (theNewsApiKey && !estaBloqueado(THENEWSAPI_BLOQUEADO_KEY)) {
    try {
      const { resultados, nextPage, totalResults } = await fetchTheNewsAPI(params);
      if (tieneResultados(resultados)) {
        return { resultados, fuente: 'thenewsapi', nextPage, totalResults };
      }
    } catch (err) {
      if (err.message === 'QUOTA_EXCEEDED') {
        bloquearPor1Hora(THENEWSAPI_BLOQUEADO_KEY);
        console.warn('TheNewsAPI sin creditos. Cambiando a NewsAPI.org...');
      } else {
        throw err;
      }
    }
  }

  if (newsApiKey && !estaBloqueado(NEWSAPI_BLOQUEADO_KEY)) {
    try {
      const { resultados, nextPage, totalResults } = await fetchNewsAPI(params);
      if (tieneResultados(resultados)) {
        return { resultados, fuente: 'newsapi', nextPage, totalResults };
      }
    } catch (err) {
      if (err.message === 'QUOTA_EXCEEDED') {
        bloquearPor1Hora(NEWSAPI_BLOQUEADO_KEY);
        console.warn('NewsAPI.org sin creditos. Cambiando a RSS...');
      } else {
        throw err;
      }
    }
  }

  const resultados = await fetchRSSFallback(params);
  return { resultados, fuente: 'rss', nextPage: null, totalResults: resultados.length };
};
