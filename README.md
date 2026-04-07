# CUBAPRESS - Buscador de Noticias

Aplicación web en React + Vite para consultar noticias con enfoque en Cuba, usando un sistema de fallback entre varias APIs y RSS directos. Incluye filtros por categoría/fuente, historial de búsquedas, vista grid/lista, scroll infinito y generación de boletín en Word.

## Características

- Búsqueda por texto con debounce y filtros por categoría.
- Filtro por fuente específica (dominio) y búsquedas rápidas.
- Fallback automático de proveedores:
    NewsData.io -> TheNewsAPI -> NewsAPI.org -> RSS.
- Bloqueo temporal por cuota agotada para evitar reintentos inútiles.
- Lectura de RSS por fuente y fallback RSS global por dominios.
- Vista grid y lista, diseño Newsroom Dark responsive.
- Selección de noticias y exportación de boletín .docx.
- Limpieza de contenido scrapeado para reportes más legibles.

## Stack técnico

- Frontend: React 18, Vite 6.
- UI: Material UI 6 + CSS custom.
- Parsing RSS/XML: fast-xml-parser.
- Scraping HTML: cheerio.
- Exportación Word: docx + file-saver.
- API handlers serverless: carpeta api (compatible con despliegues tipo Vercel).

## Requisitos

- Node.js 18+ (recomendado 20+).
- npm 9+.

## Instalación y arranque local

1. Clona el repositorio.

```bash
git clone <url-del-repo>
cd Buscador-de-Noticias-con-React
```

2. Instala dependencias.

```bash
npm install
```

3. Crea tu archivo de entorno.

```bash
cp .env.example .env
```

Si no tienes .env.example, crea .env manualmente con las variables de la sección siguiente.

4. Ejecuta en desarrollo.

```bash
npm run dev
```

5. Abre la URL que imprime Vite (normalmente http://localhost:5173).

## Variables de entorno

Variables usadas por el proyecto:

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| VITE_NEWSDATA_API_KEY | No | API key de NewsData.io |
| VITE_THENEWSAPI_KEY | No | API key de TheNewsAPI |
| VITE_NEWSAPI_KEY | No | API key de NewsAPI.org |
| VITE_SCRAPE_API_BASE_URL | Opcional | Base URL del endpoint de scraping (si está vacío, usa rutas relativas) |
| VITE_REPORT_BLOCKED_DOMAINS | Opcional | Lista CSV de dominios a excluir del boletín |

Ejemplo mínimo de .env:

```env
VITE_NEWSDATA_API_KEY=
VITE_THENEWSAPI_KEY=
VITE_NEWSAPI_KEY=
VITE_SCRAPE_API_BASE_URL=
VITE_REPORT_BLOCKED_DOMAINS=news.google.com
```

Notas:

- Puedes dejar vacías las APIs y operar solo con RSS.
- Con al menos una API configurada, el fallback intentará usarlas por orden.

## Scripts disponibles

```bash
npm run dev      # desarrollo
npm run build    # build producción
npm run preview  # previsualizar build
npm run lint     # eslint
```

## Arquitectura del proyecto

```text
api/
    rss.js         # endpoint serverless para parsear RSS
    scrape.js      # endpoint serverless para extraer texto completo
src/
    components/
        Header.jsx
        BreakingNewsBanner.jsx
        Formulario.jsx
        ListadoNoticias.jsx
        Noticia.jsx
        FloatingCart.jsx
        SelectorFuente.jsx
    hooks/
        useNoticias.js   # flujo principal de consulta + paginación
        useRSS.js        # lectura RSS por fuente específica
    services/
        fetchConFallback.js
        newsdata.js
        thenewsapi.js
        newsapi.js
        rss.js
    config/
        fuentes.js
        fuentes-rss.js
    theme/
        newsroomTheme.js
    App.jsx
    styles.css
```

## Flujo de datos

1. La UI manda filtros a useNoticias.
2. useNoticias llama a fetchConFallback.
3. fetchConFallback intenta proveedores en este orden:
     NewsData -> TheNewsAPI -> NewsAPI -> RSS.
4. Si una API responde cuota agotada, se marca como bloqueada por 1 hora en localStorage.
5. La app conserva paginación e integra scroll infinito cuando hay nextPage.

Cuando se selecciona una fuente RSS directa:

1. App usa useRSS en vez de useNoticias.
2. useRSS consulta /api/rss?feed=...
3. Se filtra por query y se informa disponibilidad del feed.

## Boletín en Word

El botón flotante permite seleccionar noticias y generar un boletín .docx.

Pipeline resumido:

1. Toma noticias seleccionadas.
2. Intenta enriquecer cada una con /api/scrape.
3. Limpia ruido/boilerplate y deduplica contenido.
4. Excluye dominios bloqueados para reporte.
5. Genera y descarga Boletin_Noticias.docx.

## Diseño y responsive

- Tema editorial Newsroom Dark aplicado con MUI ThemeProvider.
- Layout responsive en header, banner, filtros, cards y carrito flotante.
- Breakpoints cubiertos:
    móvil (<600), tablet (600-900), desktop (>900).

## Despliegue

### Opción 1: Vercel

Este proyecto usa handlers en api, compatible con Vercel Functions.

1. Conecta el repositorio en Vercel.
2. Framework preset: Vite.
3. Configura las variables de entorno VITE_*.
4. Deploy.

### Opción 2: build estático

Si no usarás api/rss y api/scrape en el mismo host:

1. Ejecuta npm run build.
2. Publica dist en tu hosting estático.
3. Apunta VITE_SCRAPE_API_BASE_URL a un backend accesible.

## Troubleshooting

- No aparecen noticias:
    revisa llaves API o prueba fuente RSS específica.
- Error de cuota:
    la app bloquea temporalmente proveedores agotados por 1 hora.
- El boletín sale vacío:
    revisa dominios bloqueados en VITE_REPORT_BLOCKED_DOMAINS.
- Feed RSS no disponible:
    verifica la URL del feed en config/fuentes-rss.js.

## Estado actual

Proyecto activo con rediseño visual estilo Newsroom Dark y mejoras recientes en responsive, interacción de tarjetas y consistencia visual.
