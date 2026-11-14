#!/usr/bin/env node

/**
 * Script para validar directamente los feeds RSS especificados
 * Realiza solicitudes HTTP GET y verifica:
 * - Código de respuesta 200
 * - Contenido RSS válido
 * - Presencia de items/entries
 * - Accesibilidad directa
 */

import https from 'https';
import http from 'http';
import { XMLParser } from 'fast-xml-parser';

const feeds = [
  {
    nombre: 'Cubadebate',
    url: 'https://www.cubadebate.cu/feed/',
  },
  {
    nombre: 'Juventud Rebelde',
    url: 'https://www.juventudrebelde.cu/feed/',
  },
  {
    nombre: 'ACN',
    url: 'https://www.acn.cu/feed/',
  },
  {
    nombre: 'Infobae',
    url: 'https://www.infobae.com/feed/',
  },
  {
    nombre: 'RT',
    url: 'https://actualidad.rt.com/feeds/rss',
  },
  {
    nombre: 'teleSUR',
    url: 'https://www.telesurtv.net/feed/',
  },
  {
    nombre: 'Tribuna',
    url: 'https://www.tribuna.cu/feed/',
  },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

const fetchUrl = (url, redirectCount = 0) => {
  return new Promise((resolve) => {
    const maxRedirects = 5;
    
    if (redirectCount > maxRedirects) {
      resolve({
        success: false,
        error: `Demasiadas redirecciones (${maxRedirects}+)`,
        status: null,
      });
      return;
    }
    
    const protocol = url.startsWith('https') ? https : http;
    const timeout = 20000; // Aumentado a 20s
    
    const req = protocol.get(url, { 
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml',
      }
    }, (res) => {
      // Manejar redirecciones
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const location = res.headers.location;
        const absoluteLocation = location.startsWith('http') 
          ? location 
          : new URL(location, url).href;
        
        resolve(fetchUrl(absoluteLocation, redirectCount + 1));
        return;
      }
      
      let data = '';
      let receivedBytes = 0;
      const maxSize = 5 * 1024 * 1024; // 5MB limite
      
      res.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes > maxSize) {
          req.destroy();
          resolve({
            status: res.statusCode,
            success: false,
            error: 'Respuesta demasiado grande',
          });
          return;
        }
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data,
          headers: res.headers,
          success: true,
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        status: null,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout (>20s)',
        status: null,
      });
    });
  });
};

const validarFeed = async (feed) => {
  console.log(`\nValidando: ${feed.nombre}`);
  console.log(`URL: ${feed.url}`);
  console.log('---');
  
  const resultado = await fetchUrl(feed.url);
  
  if (!resultado.success) {
    console.log(`ERROR: ${resultado.error}`);
    console.log(`Código HTTP: ${resultado.status || 'N/A'}`);
    return {
      nombre: feed.nombre,
      funciona: false,
      razon: resultado.error,
      statusCode: resultado.status,
    };
  }
  
  // Validar código HTTP
  if (resultado.status !== 200) {
    console.log(`ERROR: HTTP ${resultado.status} (esperado 200)`);
    if (resultado.status >= 300 && resultado.status < 400) {
      console.log(`(Redirección finalizada en estado ${resultado.status})`);
    }
    return {
      nombre: feed.nombre,
      funciona: false,
      razon: `HTTP ${resultado.status}`,
      statusCode: resultado.status,
    };
  }
  
  // Validar tipo de contenido
  const contentType = resultado.headers['content-type'] || '';
  console.log(`Content-Type: ${contentType}`);
  
  // Validar contenido RSS
  try {
    const parsed = parser.parse(resultado.data);
    
    // Verificar estructura RSS
    const esRss = parsed?.rss;
    const esFeed = parsed?.feed;
    
    if (!esRss && !esFeed) {
      console.log('ERROR: No contiene estructura RSS o Atom válida');
      return {
        nombre: feed.nombre,
        funciona: false,
        razon: 'Estructura RSS inválida',
        statusCode: 200,
      };
    }
    
    const channel = esRss?.channel || esFeed;
    const items = channel?.item || channel?.entry || [];
    const itemArray = Array.isArray(items) ? items : (items ? [items] : []);
    
    if (itemArray.length === 0) {
      console.log('ADVERTENCIA: Feed RSS válido pero sin items');
      return {
        nombre: feed.nombre,
        funciona: true,
        razon: 'Sin items',
        statusCode: 200,
        items: 0,
      };
    }
    
    // Feed válido con contenido
    console.log(`ÉXITO: ${itemArray.length} items encontrados`);
    
    // Mostrar info del primer item
    const primerItem = itemArray[0];
    const titulo = primerItem?.title || '(sin título)';
    console.log(`Primer item: ${titulo.substring(0, 70)}`);
    
    return {
      nombre: feed.nombre,
      funciona: true,
      statusCode: 200,
      items: itemArray.length,
    };
    
  } catch (error) {
    console.log(`ERROR al parsear RSS: ${error.message}`);
    console.log(`Primeros 200 caracteres recibidos:`);
    console.log(resultado.data.substring(0, 200));
    return {
      nombre: feed.nombre,
      funciona: false,
      razon: `Error al parsear: ${error.message}`,
      statusCode: 200,
    };
  }
};

const ejecutar = async () => {
  console.log('========== VALIDACIÓN DE FEEDS RSS DIRECTA ==========');
  console.log(`Validando ${feeds.length} feeds...\n`);
  
  const resultados = [];
  
  for (const feed of feeds) {
    const resultado = await validarFeed(feed);
    resultados.push(resultado);
    // Delay para no sobrecargar servidores
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumen
  console.log('\n========== RESUMEN ==========\n');
  
  const funcionan = resultados.filter(r => r.funciona);
  const noFuncionan = resultados.filter(r => !r.funciona);
  
  console.log(`FUNCIONAN (${funcionan.length}):`);
  funcionan.forEach(r => {
    const items = r.items ? ` - ${r.items} items` : '';
    console.log(`  ✓ ${r.nombre}${items}`);
  });
  
  console.log(`\nNO FUNCIONAN (${noFuncionan.length}):`);
  noFuncionan.forEach(r => {
    console.log(`  ✗ ${r.nombre}`);
    console.log(`    Razón: ${r.razon}`);
    if (r.statusCode) console.log(`    Status: ${r.statusCode}`);
  });
  
  console.log(`\nTotal: ${funcionan.length}/${feeds.length} operativos`);
  
  process.exit(noFuncionan.length > 0 ? 1 : 0);
};

ejecutar();
