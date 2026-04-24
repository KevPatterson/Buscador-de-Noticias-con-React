# CUBAPRESS

Agregador de noticias con enfoque en medios cubanos. Combina múltiples fuentes (APIs y RSS) con fallback automático, filtros por categoría y fuente, y exportación de boletines en Word.

## Instalación

```bash
npm install
cp .env.example .env
npm run dev
```

## Variables de entorno

```env
VITE_NEWSDATA_API_KEY=tu_key
VITE_THENEWSAPI_KEY=tu_key
VITE_NEWSAPI_KEY=tu_key
VITE_SCRAPE_API_BASE_URL=
VITE_REPORT_BLOCKED_DOMAINS=news.google.com
```

Las API keys son opcionales. Sin ellas, la app funciona solo con RSS.

## Características

- Fallback automático entre NewsData, TheNewsAPI, NewsAPI y RSS
- Filtros por categoría, fuente y búsqueda de texto
- Vista grid/lista con scroll infinito
- Selección de noticias y exportación a .docx
- Diseño responsive estilo editorial

## Stack

React 18, Vite 6, Material UI 6, fast-xml-parser, cheerio, docx

## Despliegue

Compatible con Vercel (incluye serverless functions en /api) o cualquier hosting estático.
