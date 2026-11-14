#!/usr/bin/env node

/**
 * Script para descubrir feeds RSS alternativos en los sitios
 * Intenta variaciones comunes de URLs de feeds
 */

import https from 'https';
import http from 'http';

const sitios = [
  {
    nombre: 'Cubadebate',
    dominio: 'www.cubadebate.cu',
    variaciones: [
      '/feed/',
      '/feeds/',
      '/rss/',
      '/?feed=rss2',
      '/?feed=rss',
      '/feeds/rss/',
    ],
  },
  {
    nombre: 'Juventud Rebelde',
    dominio: 'www.juventudrebelde.cu',
    variaciones: [
      '/feed/',
      '/feeds/',
      '/rss/',
      '/?feed=rss2',
      '/?feed=rss',
    ],
  },
  {
    nombre: 'ACN',
    dominio: 'www.acn.cu',
    variaciones: [
      '/feed/',
      '/feeds/',
      '/rss/',
      '/noticias/feed/',
      '/?feed=rss2',
    ],
  },
  {
    nombre: 'Infobae',
    dominio: 'www.infobae.com',
    variaciones: [
      '/feed/',
      '/feeds/',
      '/rss/',
      '/?feed=rss2',
      '/opinion/feed/',
      '/argentina/feed/',
    ],
  },
  {
    nombre: 'RT',
    dominio: 'actualidad.rt.com',
    variaciones: [
      '/feeds/rss',
      '/feed/',
      '/feeds/',
      '/?feed=rss2',
    ],
  },
  {
    nombre: 'teleSUR',
    dominio: 'www.telesurtv.net',
    variaciones: [
      '/feed/',
      '/feeds/',
      '/rss/',
      '/?feed=rss2',
    ],
  },
];

const testUrl = (url) => {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = 8000;
    
    const req = protocol.get(url, { 
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }
    }, (res) => {
      let dataSize = 0;
      
      res.on('data', (chunk) => {
        dataSize += chunk.length;
        if (dataSize > 100) { // Solo necesitamos confirmar que hay contenido
          req.destroy();
        }
      });
      
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          contentType: res.headers['content-type'],
          success: res.statusCode === 200,
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        url,
        status: null,
        error: error.code,
        success: false,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        status: null,
        error: 'TIMEOUT',
        success: false,
      });
    });
  });
};

const descubrirFeeds = async (sitio) => {
  console.log(`\n${sitio.nombre} (${sitio.dominio})`);
  console.log('─'.repeat(60));
  
  const resultados = [];
  
  for (const variacion of sitio.variaciones) {
    const url = `https://${sitio.dominio}${variacion}`;
    const resultado = await testUrl(url);
    resultados.push(resultado);
    
    if (resultado.success) {
      const tipo = resultado.contentType || 'desconocido';
      console.log(`  ✓ HTTP ${resultado.status} - ${variacion}`);
      console.log(`    Tipo: ${tipo}`);
    } else {
      console.log(`  ✗ ${resultado.status || resultado.error} - ${variacion}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return resultados.filter(r => r.success);
};

const main = async () => {
  console.log('========== DESCUBRIMIENTO DE FEEDS RSS ==========');
  console.log('Probando variaciones comunes de URLs de feeds\n');
  
  const hallazgos = {};
  
  for (const sitio of sitios) {
    const feeds = await descubrirFeeds(sitio);
    hallazgos[sitio.nombre] = feeds;
  }
  
  // Resumen
  console.log('\n\n========== RESUMEN DE HALLAZGOS ==========\n');
  
  for (const [nombre, feeds] of Object.entries(hallazgos)) {
    if (feeds.length > 0) {
      console.log(`${nombre}:`);
      feeds.forEach(f => {
        console.log(`  → ${f.url}`);
      });
    } else {
      console.log(`${nombre}: (sin feeds encontrados)`);
    }
  }
  
  console.log('\n');
};

main();
