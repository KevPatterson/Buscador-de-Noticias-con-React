# CUBAPRESS - Checklist de Despliegue a Vercel

Este documento describe los pasos necesarios para desplegar CUBAPRESS de forma segura en Vercel.

## 🔒 Seguridad de API Keys

### Paso 1: Configuración de Variables de Entorno en Vercel

Las claves de API se deben configurar **sin el prefijo `VITE_`** para evitar que se expongan en el bundle del navegador.

**IMPORTANTE**: Las claves se usan SOLO en el servidor (funciones serverless en `/api`). Nunca están disponibles en el navegador.

**Variables a configurar en Vercel Dashboard → Settings → Environment Variables:**

```
NEWSDATA_API_KEY=<tu_clave_de_newsdata>
THENEWSAPI_KEY=<tu_clave_de_thenewsapi>
NEWSAPI_KEY=<tu_clave_de_newsapi>
VERCEL_URL=<tu_dominio>.vercel.app
```

**Obtener las claves:**
- **NewsData.io**: https://newsdata.io (gratis, ~100 req/día)
- **TheNewsAPI**: https://thenewsapi.com (gratis, ~1000 req/mes)
- **NewsAPI.org**: https://newsapi.org (freemium, ~500 req/mes)

### Paso 2: Verificar Que No Hay Claves Expuestas

Después de desplegar, verificar que el bundle no contiene las claves:

```bash
npm run build
# Verifica automáticamente (postbuild)
```

Si el script `postbuild` falla, hay claves expuestas. NO desplegar.

### Paso 3: Rotar Claves Anteriores (Primera Vez)

Si había claves públicamente expuestas en una versión anterior:
1. Revoca o regenera inmediatamente todas las claves en cada servicio
2. Genera nuevas claves
3. Configúralas en Vercel
4. Haz deploy

## 🚀 Despliegue en Vercel

### Paso 1: Conectar Repositorio

1. Ve a https://vercel.com/new
2. Selecciona tu repositorio de GitHub/GitLab/Bitbucket
3. Elige "CUBAPRESS" como proyecto

### Paso 2: Configurar Variables de Entorno

En **Vercel Dashboard → Project Settings → Environment Variables**:

```
NEWSDATA_API_KEY = <valor>
THENEWSAPI_KEY = <valor>
NEWSAPI_KEY = <valor>
VERCEL_URL = auto-rellenado (ejemplo: cubapress.vercel.app)
```

**Importante**: Los nombres NO llevan `VITE_` prefix.

### Paso 3: Desplegar

```bash
git push origin main
# Vercel detecta automáticamente y despliega
```

O manualmente:
```bash
vercel --prod
```

### Paso 4: Validar Despliegue

1. Abre https://tu-dominio.vercel.app
2. Busca una noticia
3. Verifica en DevTools (F12) que el bundle NO contiene ninguna clave API
4. Verifica en Network que `/api/news` devuelve artículos correctamente

## 📋 Flujo de Fallback de APIs

La aplicación intenta obtener noticias en este orden:

1. **NewsData.io** (si `NEWSDATA_API_KEY` está configurada)
   - Mejor para búsquedas específicas por dominio
   - Soporta filtrado por `domainurl`
   
2. **TheNewsAPI** (si `THENEWSAPI_KEY` está configurada)
   - Buena alternativa si NewsData está agotada
   - Soporta búsqueda y categorías
   
3. **NewsAPI.org** (si `NEWSAPI_KEY` está configurada)
   - Fallback adicional
   - Limitaciones en dominio específico
   
4. **RSS Directo** (sin API key)
   - SIEMPRE disponible como último recurso
   - Alimenta desde fuentes RSS configuradas en `src/config/fuentes-rss.js`

**Ventaja**: La app nunca se queda sin noticias, aunque todas las APIs se agoten.

## 🔐 Seguridad en Producción

### CORS

- Solo se permite el dominio de Vercel (automático con `VERCEL_URL`)
- En desarrollo, se permite `localhost:5173` y `127.0.0.1:5173`
- Modificar en `src/lib/cors.js` si es necesario

### SSRF (Server-Side Request Forgery)

Las funciones `/api/rss` y `/api/scrape` validan:

- ✅ URL debe estar en allowlist (dominios cubanos autorizados)
- ✅ Valida DNS antes de conectar
- ✅ Bloquea IPs privadas, loopback y link-local
- ✅ Máximo 3 redirects con revalidación en cada salto
- ✅ Timeout de 10 segundos
- ✅ Máximo 2 MB por respuesta
- ✅ Solo Content-Type `text/html`, `application/xml`, `text/xml`, `application/rss+xml`

**No requiere configuración adicional.**

## ✅ Checklist Pre-Despliegue

- [ ] Nuevas variables de entorno configuradas en Vercel (SIN `VITE_`)
- [ ] Claves rotadas si fueron expuestas anteriormente
- [ ] `npm run build` pasa sin errores
- [ ] `npm run lint` sin warnings críticos
- [ ] Repositorio en `git push` (Vercel despliega automáticamente)
- [ ] DevTools verifica que bundle no tiene claves API
- [ ] `/api/news` devuelve artículos correctamente
- [ ] `/api/rss?feed=...` funciona
- [ ] Búsqueda funciona desde la UI

## 📞 Solucionar Problemas

### "Error: Falta parametro url" en /api/scrape

- Verificar que la URL está URL-encodada correctamente
- Verificar que el dominio está en la allowlist

### "Error: El dominio no está en la lista de permitidos"

- Agregar el dominio a `src/config/fuentes.js` → `DOMINIOS_PREFERIDOS`
- Re-desplegar

### "No hay artículos" o "Timeout"

- Verificar que al menos una clave de API está configurada
- Consultar logs en Vercel Dashboard (Function Logs)
- Si todas las APIs están agotadas, debería caer a RSS (sin claves)

### "Clave de API expuesta en el bundle"

- Ejecutar `npm run build` localmente y revisar `/dist`
- Buscar manualmente qué variable está escapando
- Nunca prefixar con `VITE_`
- Revisar imports en componentes React

## 🔄 Actualizar en Futuro

### Agregar nueva fuente RSS

1. Editar `src/config/fuentes-rss.js`
2. Agregar nuevo objeto `{ dominio, nombre, feed }`
3. Validar en local: `node scripts/test-extraccion.js`
4. Commit y push (Vercel despliega automático)

### Ajustar selectores CSS

1. Editar `config/extractors.js` → `DOMAIN_RULES`
2. Agregar o actualizar `removeSelectors` y `contentSelectors` por dominio
3. Testear: `npm run build`
4. Commit y push

### Rotar API Keys

1. Generar nuevas claves en cada servicio (NewsData, TheNewsAPI, NewsAPI)
2. Actualizar en Vercel Dashboard
3. Vercel redeploy automático (puede tomar 1-2 min)
4. Verificar que funciona
5. Revocar/invalidar las claves antiguas en cada servicio

---

**Última actualización**: Noviembre 2026
**Autor**: Clavisoft
