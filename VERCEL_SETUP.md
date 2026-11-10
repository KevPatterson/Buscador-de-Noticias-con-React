# Configuración de CUBAPRESS en Vercel

Este documento explica cómo configurar correctamente las variables de entorno para desplegar CUBAPRESS en Vercel con seguridad máxima.

## Variables de Entorno Requeridas

### 1. Claves de API (Sin prefijo VITE_) - SERVIDOR SOLAMENTE

**IMPORTANTE**: Estas variables **NO** se prefijan con `VITE_` porque deben permanecer **SOLO en el servidor**. Nunca serán expuestas en el bundle del navegador.

#### `NEWSDATA_API_KEY`
- **Descripción**: Clave de API para NewsData.io
- **Dónde obtenerla**: https://newsdata.io/get-api
- **Tipo**: Secreto (obligatorio)
- **Ejemplo**: `pub_abc123xyz...`
- **Uso**: Primera opción en cascada de APIs
- **Límite**: Típicamente 200 noticias/día en plan gratuito

#### `THENEWSAPI_KEY`
- **Descripción**: Clave de API para TheNewsAPI.com
- **Dónde obtenerla**: https://thenewsapi.com
- **Tipo**: Secreto (obligatorio)
- **Ejemplo**: `i6gnmsG62twSAoTq...`
- **Uso**: Segunda opción en cascada de APIs
- **Límite**: 200 noticias/día

#### `NEWSAPI_KEY`
- **Descripción**: Clave de API para NewsAPI.org
- **Dónde obtenerla**: https://newsapi.org/
- **Tipo**: Secreto (obligatorio)
- **Ejemplo**: `bbcb770c20c248e9...`
- **Uso**: Tercera opción en cascada de APIs
- **Límite**: 100 noticias/día

### 2. Configuración de Vercel - SERVIDOR

#### `VERCEL_URL`
- **Descripción**: URL del despliegue en Vercel
- **Generada automáticamente**: Sí (Vercel la añade)
- **Ejemplo**: `cubapress.vercel.app`
- **Uso**: CORS restringido y validación SSRF
- **Acción**: **DEJAR EN AUTOMÁTICO** (Vercel la configura)

## Paso a Paso: Configurar en Vercel Dashboard

### 1. Acceder al Dashboard
1. Ir a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Seleccionar el proyecto **CUBAPRESS**

### 2. Ir a Configuración → Environment Variables
```
Settings → Environment Variables
```

### 3. Agregar cada variable (sin prefijo VITE_)

**Paso 1: NEWSDATA_API_KEY**
```
Name:  NEWSDATA_API_KEY
Value: <tu_clave_de_newsdata>
Environment: Production
```

**Paso 2: THENEWSAPI_KEY**
```
Name:  THENEWSAPI_KEY
Value: <tu_clave_de_thenewsapi>
Environment: Production
```

**Paso 3: NEWSAPI_KEY**
```
Name:  NEWSAPI_KEY
Value: <tu_clave_de_newsapi>
Environment: Production
```

### 4. Desplegar
1. Volver a **Deployments**
2. Click en **Redeploy** en el último deployment
3. Seleccionar **Redeploy**
4. Esperar a que la compilación termine

## Verificación Post-Despliegue

### 1. Verificar que NO hay claves en el bundle
```bash
# El postbuild ejecutará automáticamente:
node scripts/verify-no-keys.js

# Debe mostrar:
# "Verificacion OK: no se encontraron claves de API en dist."
```

### 2. Probar endpoint /api/news en Vercel
```bash
curl "https://tu-url-vercel.app/api/news?q=Cuba&pagina=1"
```

Debe devolver:
```json
{
  "status": "ok",
  "resultados": [...],
  "fuente": "newsdata|thenewsapi|newsapi|rss",
  "totalResults": 123
}
```

### 3. Probar endpoint /api/scrape
```bash
curl "https://tu-url-vercel.app/api/scrape?url=https://cubadebate.cu"
```

Debe devolver:
```json
{
  "cuerpo": "contenido extraído...",
  "metodo": "json-ld|readability|jina-proxy",
  "calidad": "alta|media|baja",
  "autor": "...",
  "titulo": "...",
  "fecha": "...",
  "imagen": "...",
  "urlCanonica": "..."
}
```

## Seguridad: Rotación de Claves

### Cuándo rotar claves
- Si fueron expuestas públicamente (incluso en commits anteriores)
- Cada 3-6 meses como buena práctica
- Inmediatamente si hay sospecha de compromiso

### Cómo rotar claves
1. Generar nuevas claves en cada proveedor (NewsData, TheNewsAPI, NewsAPI)
2. Actualizar las variables en Vercel Dashboard
3. Hacer redeploy
4. Revocar/eliminar las claves antiguas en el dashboard de cada proveedor

### Verificación
Después de rotación, esperar 5 minutos y probar:
```bash
# Debe funcionar con las nuevas claves
curl "https://tu-url-vercel.app/api/news?q=test"
```

## Variables de Configuración Pública (CON prefijo VITE_)

Estas variables SÍ son públicas y aparecen en el bundle del navegador:

### `VITE_SCRAPE_API_BASE_URL` (Opcional)
- **Descripción**: URL base para llamadas internas de scraping
- **Ejemplo**: `https://cubapress.vercel.app`
- **En desarrollo**: Dejar vacío (usa localhost:5173)
- **En producción**: Dejar vacío (usa la URL actual automáticamente)
- **Acción**: **NO NECESITA CONFIGURAR**

### `VITE_REPORT_BLOCKED_DOMAINS` (Opcional)
- **Descripción**: Dominios excluidos de boletines (separados por coma)
- **Ejemplo**: `news.google.com,other-domain.com`
- **Default**: `news.google.com`
- **Acción**: **OPCIONAL** - solo si necesitas excluir más dominios

## Estructura de Seguridad

```
Usuario → Frontend (sin acceso a keys)
         ↓
      /api/news (SERVER)
         ↓
   process.env.NEWSDATA_API_KEY (servidor solo)
   process.env.THENEWSAPI_KEY (servidor solo)
   process.env.NEWSAPI_KEY (servidor solo)
         ↓
   Cascada: NewsData → TheNewsAPI → NewsAPI → RSS
```

## Archivos de Configuración

### `.env.example` (referencia, no usar)
```bash
# Copiar este archivo y completar con VERDADERAS claves
cp .env.example .env
# EDITAR .env con las claves reales
# .env NUNCA debe cometerse a git (está en .gitignore)
```

### `.env` (LOCAL - nunca cometer a git)
```
NEWSDATA_API_KEY=<tu_clave>
THENEWSAPI_KEY=<tu_clave>
NEWSAPI_KEY=<tu_clave>
VERCEL_URL=  # Dejar vacío en local
```

### Vercel Dashboard (PRODUCCIÓN)
```
Settings → Environment Variables
(Configurar las 3 claves sin prefijo VITE_)
```

## Troubleshooting

### Error: "El dominio no está en la lista de permitidos"
- **Causa**: URL no en allowlist de fuentes cubanas
- **Solución**: Verificar que el dominio está en `src/config/fuentes.js`

### Error: "QUOTA_EXCEEDED"
- **Causa**: Se agotó el límite diario de la API
- **Solución**: Esperar 24h o cambiar a siguiente API en cascada

### Error: "No se pudo obtener noticias"
- **Causa**: Todas las APIs agotadas
- **Solución**: Sistema fallback a RSS directos

### El build dice "Claves encontradas en dist"
- **Causa**: Una clave de API se metió en el bundle
- **Solución**: Verificar que NO hay `VITE_NEWSDATA_API_KEY` en código
- **Check**: `grep -r "VITE_.*API_KEY" src/`

## URLs Útiles

- **Vercel Dashboard**: https://vercel.com/dashboard
- **NewsData.io**: https://newsdata.io
- **TheNewsAPI**: https://thenewsapi.com
- **NewsAPI.org**: https://newsapi.org
- **GitHub CUBAPRESS**: https://github.com/clavisoft/cubapress

## Checklist Final

- [ ] 3 claves de API generadas en cada proveedor
- [ ] Variables configuradas en Vercel sin prefijo VITE_
- [ ] Redeploy completado exitosamente
- [ ] `/api/news` responde con artículos
- [ ] `/api/scrape` extrae contenido
- [ ] `npm run build` pasa con "Verificacion OK"
- [ ] Scripts de prueba ejecutados localmente
- [ ] Claves antiguas revocadas

## Soporte

Si encuentras problemas:
1. Revisar logs en Vercel Dashboard → Deployments → Logs
2. Ejecutar `npm run build` localmente para simular
3. Verificar que los 3 endpoints devuelven respuestas correctas
4. Confirmar que `.env` NO está cometido (debe estar en .gitignore)
