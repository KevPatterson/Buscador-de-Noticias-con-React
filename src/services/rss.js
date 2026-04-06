import { FUENTES_RSS } from '../config/fuentes-rss';

const parseDominios = (domainurl = '') =>
  domainurl
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export const fetchRSSFallback = async ({ query, domainurl, signal }) => {
  const dominios = parseDominios(domainurl);
  const fuentesObjetivo = dominios.length
    ? FUENTES_RSS.filter((fuente) => dominios.includes(fuente.dominio.toLowerCase()))
    : FUENTES_RSS;

  const promesas = fuentesObjetivo.map((fuente) =>
    fetch(`/api/rss?feed=${encodeURIComponent(fuente.feed)}`, { signal })
      .then((r) => r.json())
      .then((d) => d.results || [])
      .catch(() => [])
  );

  const todos = (await Promise.all(promesas)).flat();

  if (!query) return todos;

  const q = query.toLowerCase();
  return todos.filter(
    (art) => art.title?.toLowerCase().includes(q) || art.description?.toLowerCase().includes(q)
  );
};
