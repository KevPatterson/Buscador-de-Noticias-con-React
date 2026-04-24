# CUBAPRESS

<div align="center">

**Agregador de noticias con enfoque en medios cubanos**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg)](https://vitejs.dev/)

</div>

## 📋 Descripción

CUBAPRESS es un agregador de noticias diseñado para centralizar información de medios cubanos e internacionales. Implementa un sistema inteligente de fallback entre múltiples APIs y fuentes RSS, garantizando disponibilidad continua del servicio.

### Características principales

- 🔄 **Fallback automático** entre NewsData.io, TheNewsAPI, NewsAPI.org y RSS directo
- 🔍 **Búsqueda avanzada** con filtros por categoría, fuente y texto libre
- 📱 **Diseño responsive** con tema editorial estilo Newsroom Dark
- 📊 **Dos modos de visualización**: grid y lista
- ♾️ **Scroll infinito** con paginación automática
- 📄 **Exportación a Word** de boletines personalizados
- 🇨🇺 **Priorización** de fuentes cubanas
- 💾 **Historial** de búsquedas recientes
- ⚡ **Scraping inteligente** para contenido completo de artículos

## 🚀 Inicio rápido

### Requisitos previos

- Node.js 18+ 
- npm 9+

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/cubapress.git
cd cubapress

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## ⚙️ Configuración

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# API Keys (opcionales - la app funciona solo con RSS si no se configuran)
VITE_NEWSDATA_API_KEY=tu_newsdata_key
VITE_THENEWSAPI_KEY=tu_thenewsapi_key
VITE_NEWSAPI_KEY=tu_newsapi_key

# Configuración de scraping (opcional)
VITE_SCRAPE_API_BASE_URL=

# Dominios bloqueados para reportes (separados por coma)
VITE_REPORT_BLOCKED_DOMAINS=news.google.com
```

### Obtener API Keys

- **NewsData.io**: [https://newsdata.io/register](https://newsdata.io/register)
- **TheNewsAPI**: [https://www.thenewsapi.com/](https://www.thenewsapi.com/)
- **NewsAPI.org**: [https://newsapi.org/register](https://newsapi.org/register)

> **Nota**: Las API keys son opcionales. Sin ellas, la aplicación funciona exclusivamente con fuentes RSS.

## 🛠️ Stack tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.3 | Framework UI |
| Vite | 6.0 | Build tool |
| Material UI | 6.3 | Componentes UI |
| fast-xml-parser | 5.5 | Parsing RSS/XML |
| cheerio | 1.0 | Web scraping |
| docx | 9.5 | Generación de documentos Word |
| file-saver | 2.0 | Descarga de archivos |

## 📁 Estructura del proyecto

```
cubapress/
├── api/                    # Serverless functions
│   ├── rss.js             # Parser de feeds RSS
│   └── scrape.js          # Extractor de contenido web
├── src/
│   ├── components/        # Componentes React
│   ├── hooks/            # Custom hooks
│   ├── services/         # Servicios de API
│   ├── config/           # Configuración de fuentes
│   ├── theme/            # Tema Material UI
│   ├── App.jsx           # Componente principal
│   └── styles.css        # Estilos globales
├── public/               # Assets estáticos
└── index.html           # Punto de entrada HTML
```

## 🎯 Uso

### Búsqueda de noticias

1. Escribe tu consulta en el campo de búsqueda
2. Selecciona una categoría (General, Tecnología, Salud, etc.)
3. Opcionalmente, filtra por fuente específica
4. Cambia entre vista grid/lista según tu preferencia

### Generar boletín

1. Selecciona las noticias de interés haciendo clic en "Seleccionar"
2. Haz clic en el botón flotante "Generar Boletín en Word"
3. El documento se descargará automáticamente con el contenido completo

### Fuentes disponibles

**Medios cubanos:**
- Cubadebate, Granma, Juventud Rebelde
- CubaSí, ACN, Tribuna de La Habana
- Radio Reloj, Prensa Latina, JIT Deporte
- Y más...

**Medios internacionales:**
- teleSUR, RT en Español, Sputnik Mundo
- CGTN Español, TV BRICS, Infobae

## 📦 Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Ejecutar ESLint
```

## 🚢 Despliegue

### Vercel (recomendado)

El proyecto incluye serverless functions compatibles con Vercel:

1. Conecta tu repositorio en [Vercel](https://vercel.com)
2. Configura las variables de entorno
3. Deploy automático

### Hosting estático

Para despliegue sin serverless functions:

```bash
npm run build
```

Sube la carpeta `dist` a tu hosting preferido. Configura `VITE_SCRAPE_API_BASE_URL` apuntando a un backend externo.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para cambios importantes:

1. Haz fork del repositorio
2. Crea una rama para tu feature:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. Commit tus cambios:
   ```bash
   git commit -m 'feat: añadir nueva funcionalidad'
   ```
4. Push a la rama:
   ```bash
   git push origin feature/nueva-funcionalidad
   ```
5. Abre un Pull Request

### Guía de estilo

- Ejecuta `npm run lint` antes de hacer commit
- Usa commits semánticos (feat, fix, docs, style, refactor, test, chore)
- Documenta cambios significativos en el código

## 🐛 Reporte de problemas

Si encuentras un bug o tienes una sugerencia:

1. Verifica que no exista un issue similar
2. Abre un nuevo issue con descripción detallada
3. Incluye pasos para reproducir el problema
4. Adjunta capturas de pantalla si es relevante

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Autor

**Clavisoft**

- Website: [clavisoft.vercel.app](https://clavisoft.vercel.app)

## 🙏 Agradecimientos

- Fuentes de noticias por proporcionar contenido público
- Comunidad de código abierto por las herramientas utilizadas

---

<div align="center">

**Hecho con ❤️ para la comunidad cubana**

</div>
