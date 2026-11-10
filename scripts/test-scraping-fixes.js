#!/usr/bin/env node

/**
 * Script de testing para validar los fixes de scraping
 * Prueba las funciones de limpieza y división de párrafos
 */

// Simulamos las funciones de limpieza que se agregaron

const cleanPressLatinFirstParagraph = (text = '') => {
  const presensLatinPattern = /^([A-ZÁ][a-záéíóú\s'.-]*,\s*\d{1,2}\s+[A-Za-záéíóú]+\s*\([^)]*\)\s+)+/i;
  
  const paragraphs = text.split('\n\n');
  if (paragraphs.length === 0) return text;
  
  const firstParagraph = paragraphs[0];
  const cleanedFirst = firstParagraph.replace(presensLatinPattern, '').trim();
  
  if (cleanedFirst !== firstParagraph.trim()) {
    const result = [cleanedFirst, ...paragraphs.slice(1)].join('\n\n');
    return result;
  }
  
  return text;
};

const splitRadioBayamoParagraphs = (text = '') => {
  const paragraphs = text.split('\n\n');
  
  if (paragraphs.length > 3) return text;
  if (text.length < 300) return text;
  
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÁ])/);
  
  const groupedParagraphs = [];
  let currentGroup = [];
  let currentGroupLength = 0;
  const targetLength = 200;
  
  sentences.forEach((sentence) => {
    currentGroup.push(sentence);
    currentGroupLength += sentence.length;
    
    if (currentGroupLength >= targetLength || currentGroup.length >= 3) {
      const paragraph = currentGroup.join(' ').trim();
      if (paragraph.length > 40) {
        groupedParagraphs.push(paragraph);
      }
      currentGroup = [];
      currentGroupLength = 0;
    }
  });
  
  if (currentGroup.length > 0) {
    const lastParagraph = currentGroup.join(' ').trim();
    if (lastParagraph.length > 40) {
      groupedParagraphs.push(lastParagraph);
    }
  }
  
  if (groupedParagraphs.length > 2) {
    return groupedParagraphs.join('\n\n');
  }
  
  return text;
};

const isErrorPage = (html = '', status = 200) => {
  if (status >= 400) return true;
  
  const htmlLower = html.toLowerCase();
  
  const errorPatterns = [
    /404.*not\s+found/i,
    /página.*no\s+encontrada/i,
    /no\s+autorizado|sin\s+acceso/i,
    /acceso\s+denegado/i,
    /error\s+403/i,
    /forbidden/i,
    /error\s+404/i,
    /page\s+not\s+found/i,
    /<title>404</i,
    /<title>403/i,
    /<title>Error/i,
  ];
  
  return errorPatterns.some(pattern => pattern.test(htmlLower));
};

// Tests
console.log('\n========== PRUEBAS DE SCRAPING FIXES ==========\n');

// Test 1: Limpieza de Prensa Latina - Caso del documento
console.log('TEST 1: Limpieza de prefijo Prensa Latina (caso real del documento)');
console.log('-'.repeat(50));

const presensLatinTest1 = `Buenos Aires, 10 nov (Prensa Latina) Argentina presentó hoy ante el Tribunal del Derecho del Mar con sede en Hamburgo, Alemania, su reclamo de que Reino Unido frene la explotación petrolera en las Islas Malvinas y mares adyacentes.

La delegación argentina expuso los fundamentos para exigir la suspensión del proyecto Sea Lion.`;

const cleanedPresensLatin1 = cleanPressLatinFirstParagraph(presensLatinTest1);
console.log('ENTRADA:\n', presensLatinTest1.substring(0, 120) + '...\n');
console.log('SALIDA:\n', cleanedPresensLatin1.substring(0, 120) + '...\n');

const hasDatePrefix1 = /^[A-ZÁ][a-záéíóú\s'.-]*,\s*\d{1,2}\s+[A-Za-záéíóú]+\s*\([^)]*\)/.test(cleanedPresensLatin1);
console.log('✓ RESULTADO:', hasDatePrefix1 ? '❌ FALLO - Aún tiene prefijo' : '✓ ÉXITO - Prefijo removido\n');

// Test 2: División de párrafos Radio Bayamo
console.log('TEST 2: División de párrafos Radio Bayamo');
console.log('-'.repeat(50));

const radioBayamoTest = `El domingo, el primer ministro israelí, Benjamín Netanyahu, declaró abruptamente el fin del acuerdo de alto el fuego. Además, anunció la suspensión inmediata de toda la ayuda humanitaria para los 2,3 millones de habitantes del territorio palestino asediado, desatando una ola de indignación y condena a nivel mundial. El plan, que Israel afirma haber sido propuesto por el enviado especial de Estados Unidos, Steve Witkoff, busca presionar a HAMAS para que acepte una revisión del acuerdo. En respuesta, HAMAS condenó el domingo la suspensión de la ayuda humanitaria, calificándola de "crimen de guerra" y de violación flagrante del acuerdo. La decisión de Netanyahu de suspender la ayuda humanitaria es un chantaje despreciable, un crimen de guerra y un golpe flagrante contra el acuerdo de tregua.`;

const splitParagraphs = splitRadioBayamoParagraphs(radioBayamoTest);
const numParagraphs = splitParagraphs.split('\n\n').length;

console.log('ENTRADA: Texto monolítico de ' + radioBayamoTest.length + ' caracteres\n');
console.log('SALIDA: ' + numParagraphs + ' párrafos\n');
console.log('PRIMEROS PÁRRAFOS:\n');
splitParagraphs.split('\n\n').slice(0, 3).forEach((p, i) => {
  console.log(`  Párrafo ${i + 1}: ${p.substring(0, 80)}...`);
});

console.log('\n✓ RESULTADO:', numParagraphs > 1 ? '✓ ÉXITO - Dividido en ' + numParagraphs + ' párrafos' : '❌ FALLO - No se dividió\n');

// Test 3: Detección de páginas de error
console.log('TEST 3: Detección de páginas de error');
console.log('-'.repeat(50));

const errorPageHtml1 = `<html><head><title>404 - Página no encontrada</title></head><body><h1>Página no encontrada</h1></body></html>`;
const errorPageHtml2 = `<html><head><title>Error 403 - Acceso denegado</title></head><body></body></html>`;
const validPageHtml = `<html><head><title>Noticia Importante</title></head><body><article><p>Contenido de la noticia</p></article></body></html>`;

console.log('Caso 1 - Página 404:');
console.log('  Detectado como error:', isErrorPage(errorPageHtml1, 200) ? '✓ ÉXITO' : '❌ FALLO\n');

console.log('Caso 2 - Página 403:');
console.log('  Detectado como error:', isErrorPage(errorPageHtml2, 200) ? '✓ ÉXITO' : '❌ FALLO\n');

console.log('Caso 3 - Página válida:');
console.log('  Detectado como error:', isErrorPage(validPageHtml, 200) ? '❌ FALLO - Falso positivo' : '✓ ÉXITO - Válida\n');

// Test 4: Casos de no-aplicación
console.log('TEST 4: Casos de no-aplicación (fallback safety)');
console.log('-'.repeat(50));

const noChangeTest = `Este es un párrafo normal sin ningún prefijo especial.

Segundo párrafo del artículo.`;

const resultNoChange = cleanPressLatinFirstParagraph(noChangeTest);
console.log('Entrada sin prefijo Prensa Latina:');
console.log('  Input === Output:', noChangeTest === resultNoChange ? '✓ ÉXITO - Sin cambios' : '❌ FALLO - Modificado innecesariamente');

console.log('\nTexto muy corto para Radio Bayamo:');
const shortText = 'Este es un texto muy corto.';
const resultShort = splitRadioBayamoParagraphs(shortText);
console.log('  Input === Output:', shortText === resultShort ? '✓ ÉXITO - Sin cambios' : '❌ FALLO - Modificado innecesariamente');

console.log('\n========== FIN DE PRUEBAS ==========\n');

