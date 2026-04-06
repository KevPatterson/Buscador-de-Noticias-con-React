import { FUENTES_RSS } from '../config/fuentes-rss';

export const fetchRSSFallback = async ({ query, signal }) => {
  const promesas = FUENTES_RSS.map((fuente) =>
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
