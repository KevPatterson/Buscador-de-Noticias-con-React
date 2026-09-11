import cleanArticle from '../src/services/cleanArticle.js';

const url = process.argv[2] || 'https://holanews.com/el-festival-de-cine-de-nueva-york-presentara-el-nuevo-documental-sobre-elizabeth-holmes/';

async function run() {
  try {
    const mod = await import('../api/extract-article.js');
    const mockReq = { method: 'GET', query: { url } };
    let captured;
    const mockRes = {
      _status: 200,
      status(code) { this._status = code; return this; },
      json(obj) { captured = obj; },
      setHeader() {},
    };
    await mod.default(mockReq, mockRes);
    if (!captured) return console.log('No captured');
    const original = captured.contenido || '';
    const cleaned = cleanArticle(original);
    console.log('Original length:', original.length);
    console.log('Cleaned length:', cleaned.length);
    console.log('--- Original preview ---\n', original.slice(0,800));
    console.log('\n--- Cleaned preview ---\n', cleaned.slice(0,800));
  } catch (e) {
    console.error('Error', e);
  }
}

run();
