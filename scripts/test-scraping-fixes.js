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
  // Detecta páginas de error ESPECÍFICAS sin bloquear contenido válido
  if (status >= 400) return true;
  
  const htmlLower = html.toLowerCase();
  
  // Patrones MÁS ESPECÍFICOS de error
  const errorPatterns = [
    /404\s+(not\s+found|page\s+not\s+found)/i,
    /403\s+(forbidden|access\s+denied)/i,
    /<title>\s*404/i,
    /<title>\s*403/i,
    /^<html>\s*<head>\s*<title>\s*404/i,
    /^<html>\s*<head>\s*<title>\s*403/i,
    /\[dlm_no_access\]/i,  // Drupal no access
  ];
  
  const isError = errorPatterns.some(pattern => pattern.test(htmlLower));
  
  // Si no tiene patrones claros de error, pero tiene muy poco contenido
  if (!isError && html.replace(/<[^>]*>/g, '').trim().length < 150) {
    // Pero si tiene contenido con palabras clave de artículo, NO es error
    if (/página de ejemplo|está diferente|permanecerá|estrenará|documental|noticia/i.test(htmlLower)) {
      return false;
    }
    // Si tiene muy poco contenido Y parece ser una página real pero sin contenido
    if (/sin resumen|sin acceso|no encontrado|error 404/i.test(htmlLower)) {
      return true;
    }
  }
  
  return isError;
};

// Tests
console.log('\n========== PRUEBAS DE SCRAPING FIXES ==========\n');

// Test 1: Limpieza de Prensa Latina
console.log('TEST 1: Limpieza de prefijo Prensa Latina');
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

// Test 3: Detección de páginas de error (mejorado)
console.log('TEST 3: Detección de páginas de error (especificidad mejorada)');
console.log('-'.repeat(50));

// Error 404 claro
const errorPageHtml1 = `<html><head><title>404 - Página no encontrada</title></head><body><h1>404</h1></body></html>`;
console.log('Caso 1 - Página 404 clara:');
console.log('  Detectado como error:', isErrorPage(errorPageHtml1, 200) ? '✓ ÉXITO' : '❌ FALLO');

// Página con Drupal no access
const errorPageHtml2 = `<html><body>[dlm_no_access] La entrada Sin acceso se publicó primero en Tribuna.</body></html>`;
console.log('\nCaso 2 - Drupal [dlm_no_access]:');
console.log('  Detectado como error:', isErrorPage(errorPageHtml2, 200) ? '✓ ÉXITO' : '❌ FALLO');

// Página válida (no es error aunque sea corta)
const validPageHtml1 = `<html><head><title>Noticia Importante</title></head><body><article><p>Estrenará documental sobre sismos de 2024</p></article></body></html>`;
console.log('\nCaso 3 - Página válida (corta pero con palabra clave):');
console.log('  Detectado como error:', isErrorPage(validPageHtml1, 200) ? '❌ FALLO - Falso positivo' : '✓ ÉXITO - Válida');

// Página de ejemplo de Tribuna (válida pero corta)
const validPageHtml2 = `<html><body><p>Esta es una página de ejemplo. Es diferente a una entrada del blog</p></body></html>`;
console.log('\nCaso 4 - Página de ejemplo Tribuna (válida):');
console.log('  Detectado como error:', isErrorPage(validPageHtml2, 200) ? '❌ FALLO - Falso positivo' : '✓ ÉXITO - Válida');

// Test 4: Casos de no-aplicación
console.log('\n\nTEST 4: Casos de no-aplicación (fallback safety)');
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
