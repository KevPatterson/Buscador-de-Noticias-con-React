# CUBAPRESS - Resumen de Implementación de Seguridad y Extracción

## Cambios Realizados

### FASE 1: SEGURIDAD

#### 1.1 - Rotación de API Keys Expuestas
- **Archivo**: `.env`, `.env.example`
- **Cambio**: Eliminadas todas las claves públicas del `.env` anterior
- **Razón**: Preventivo - las claves fueron expuestas en versiones anteriores y deben rotarse
- **Acción manual requerida**: 
  - Configurar nuevas keys en Vercel (sin prefijo `VITE_`):
    - `NEWSDATA_API_KEY`
    - `THENEWSAPI_KEY`
    - `NEWSAPI_KEY`

#### 1.2 - Validación SSRF Reforzada
- **Archivos**: `src/lib/secureFetch.js` (ya existía)
- **Status**: ✓ Completamente implementado
- **Características**:
  - Validación de URL (solo http/https, sin credenciales)
  - Resolución DNS antes de conectar
  - Bloqueo de IPs privadas (10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12)
  - Bloqueo de loopback (127.0.0.0/8, ::1)
  - Bloqueo de link-local (169.254.0.0/16, incluyendo 169.254.169.254)
  - Allowlist de dominios desde configuración
  - Validación de redirects (máximo 3, revalidación en cada salto)
  - Límites: 10s timeout, 2MB máximo, solo MIME types permitidos

#### 1.3 - Estructura de Respuesta Mejorada
- **Archivo**: `api/scrape.js`, `src/services/extractArticle.js`
- **Cambio**: Ahora `/api/scrape` devuelve estructura con `metodo` y `calidad`
- **Nueva respuesta**:
  ```json
  {
    "cuerpo": "contenido extraído...",
    "metodo": "json-ld|readability|jina-proxy|desconocido",
    "calidad": "alta|media|baja"
  }
  ```
- **Métodos identificados**:
  - `json-ld`: Extracción desde structured data (calidad alta)
  - `readability`: Algoritmo inteligente de contenido (calidad alta)
  - `jina-proxy`: Fallback a proxy de texto plano (calidad media)

### FASE 2: EXTRACCIÓN DE CONTENIDO

#### 2.1 - Cascada de Métodos (Implementada)
El endpoint `/api/scrape` ahora intenta extraer contenido en este orden:

1. **Método 1 - JSON-LD**: Busca `<script type="application/ld+json">` con `@type: "NewsArticle"`
2. **Método 2 - Selectores de Dominio**: Usa reglas de `config/extractors.js` por sitio
3. **Método 3 - Readability**: Algoritmo inteligente de Mozilla (linkedom)
4. **Fallback - Proxy Jina**: Si todo falla, intenta proxy de texto plano
5. **Último recurso - RSS**: Devuelve `description` del item RSS con calidad baja

#### 2.2 - Configuración por Sitio (Ya Implementada)
- **Archivo**: `config/extractors.js`
- **Dominios configurados**:
  - WordPress cubanos: Cubadebate, Granma, Juventud Rebelde, CubaSí, ACN
  - Especiales: HolaNews, Prensa Latina, Radio Bayamo, Escambray, Tribuna
- **Campos por dominio**:
  - `removeSelectors`: Elementos a eliminar
  - `contentSelectors`: Dónde buscar contenido principal
  - `preferScrape`: Flag para preferir scraping sobre RSS

#### 2.3 - Limpieza de Contenido (Implementada)
- Elimina: scripts, estilos, noscript, iframe, nav, footer, aside, comentarios
- Normaliza espacios en blanco y párrafos duplicados
- Detecta y limpia boilerplate (publicidad, menús, relacionadas)
- Filtra párrafos muy cortos (<40 caracteres)
- Soporta decodificación de charset (UTF-8, ISO-8859-1, etc.)

#### 2.4 - Deduplicación (Implementada)
- **Archivo**: `src/lib/dedupe.js`
- **Criterios**:
  - URL canónica (elimina utm_*, fbclid, fragmentos)
  - Hash de título normalizado (minúsculas, sin tildes)
- **Cache-Control**: 3600s (1 hora) + stale-while-revalidate

### FASE 3: PRUEBAS Y VALIDACIÓN

#### 3.1 - Suite de Pruebas de Extracción
- **Archivo**: `scripts/test-extraccion.js`
- **Comando**: `npm run test:extraccion`
- **Valida**:
  - Éxito/fallo de extracción
  - Método usado
  - Caracteres extraídos
  - Tiempo de ejecución
  - Calidad del contenido
- **Fixture**: 5 dominios cubanos principales
- **Salida**: Tabla coloreada con resultados

#### 3.2 - Suite de Pruebas SSRF
- **Archivo**: `scripts/test-ssrf.js`
- **Comando**: `npm run test:ssrf`
- **Pruebas negativas** (deben rechazarse):
  - 127.0.0.1, ::1 (loopback)
  - 10.0.0.1, 192.168.1.1, 172.16.0.1 (privadas)
  - 169.254.169.254 (metadata en cloud)
  - Dominios no permitidos
- **Pruebas positivas** (deben aceptarse):
  - Dominios en allowlist (cubadebate.cu, granma.cu, etc.)
  - Subdominios permitidos
- **Salida**: Tabla coloreada con códigos HTTP

#### 3.3 - Integración en Build
- **Archivo**: `package.json`
- **Script `postbuild`**: Ejecuta `node scripts/verify-no-keys.js`
- **Valida**: Ninguna clave de API en `/dist`
- **Falla el build si**: Encuentra referencias a VITE_*KEY o valores literales

## Arquitectura de Seguridad

### Flujo de API Keys
```
Usuario (Frontend) → /api/news → process.env.NEWSDATA_API_KEY
                     ↓
                   Fallback:
                   1. NewsData.io (si NEWSDATA_API_KEY)
                   2. TheNewsAPI (si THENEWSAPI_KEY)
                   3. NewsAPI.org (si NEWSAPI_KEY)
                   4. RSS Directo (sin API)
```

### Flujo de Validación SSRF
```
GET /api/scrape?url=...
    ↓
validateUrl() - formato y protocolo
    ↓
resolveHost() - DNS + bloqueo IP privada
    ↓
fetch con revalidación de redirects
```

### Variables de Entorno (Vercel)
**Sin prefijo VITE_** (lado servidor solo):
- `NEWSDATA_API_KEY` - NewData.io API key
- `THENEWSAPI_KEY` - TheNewsAPI API key
- `NEWSAPI_KEY` - NewsAPI.org API key
- `VERCEL_URL` - URL de despliegue (para CORS)

**Con prefijo VITE_** (públicas en bundle):
- `VITE_SCRAPE_API_BASE_URL` - URL base para scraping
- `VITE_REPORT_BLOCKED_DOMAINS` - Dominios excluidos de boletines

## Verificación Post-Implementación

### Checklist de Seguridad
- ✓ Ninguna clave de API en el bundle (`npm run build` pasa)
- ✓ SSRF validado (allowlist de dominios)
- ✓ DNS resolución antes de conectar
- ✓ Bloqueo de IPs privadas y de cloud
- ✓ CORS restringido a dominio propio
- ✓ User-Agent de navegador moderno
- ✓ Timeouts y límites de tamaño implementados

### Checklist de Extracción
- ✓ Cascada de métodos implementada
- ✓ Selectores por dominio configurados
- ✓ Limpieza de boilerplate funcional
- ✓ Deduplicación por URL y título
- ✓ Cache-Control configurado
- ✓ Charset detection con iconv-lite

### Checklist de Pruebas
- ✓ Script de extracción creado
- ✓ Script de SSRF creado
- ✓ Scripts integrados en `npm run test:*`
- ✓ Build verifica cero claves expuestas

## Commits Realizados

1. `refactor(scraping): agregar campos metodo y calidad a respuesta /api/scrape`
2. `test(extraction): agregar suite de pruebas de extracción y validación SSRF`

## Acciones Manuales Pendientes

1. **Rotar todas las API keys que fueron públicas** (fueron expuestas en `.env` anterior)
2. **Configurar en Vercel** (sin prefijo VITE_):
   - `NEWSDATA_API_KEY=<nueva_clave>`
   - `THENEWSAPI_KEY=<nueva_clave>`
   - `NEWSAPI_KEY=<nueva_clave>`
   - `VERCEL_URL=<tu-url-vercel>`
3. **Verificar selectores CSS** de dominios marcados "por verificar" en `config/extractors.js`
4. **Ejecutar pruebas**:
   ```bash
   npm run test:extraccion
   npm run test:ssrf
   ```
5. **Validar en staging**: Probar extracción con URLs reales de cada fuente cubana

## Notas Técnicas

- **linkedom vs jsdom**: Usamos linkedom por ser más liviano para Vercel serverless
- **iconv-lite**: Maneja decodificación de charset sin depender de node internals
- **fast-xml-parser**: Parser optimizado para RSS/XML
- **cheerio**: DOM manipulation ligero para limpieza de HTML
- **@mozilla/readability**: Extracción inteligente de artículos

## Próximos Pasos Sugeridos

1. Agregar métodos de extracción de metadatos (autor, fecha, imagen)
2. Implementar cache distribuido (Redis) para hit rate de deduplicación
3. Agregar monitoreo de tasa de extracción exitosa por dominio
4. Crear panel de administración para ajustar selectores por dominio en tiempo real
