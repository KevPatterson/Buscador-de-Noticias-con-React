import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: false,
});

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const pickText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (typeof value['#text'] === 'string') return value['#text'];
    if (typeof value['@_href'] === 'string') return value['@_href'];
  }
  return '';
};

const pickLink = (item) => {
  if (!item) return '';

  const link = item.link;
  if (!link) return '';

  if (typeof link === 'string') return link;
  if (typeof link === 'object' && typeof link['@_href'] === 'string') return link['@_href'];

  const linkArray = asArray(link);
  const withHref = linkArray.find((entry) => typeof entry?.['@_href'] === 'string');
  if (withHref) return withHref['@_href'];

  const withText = linkArray.find((entry) => typeof entry?.['#text'] === 'string');
  return withText ? withText['#text'] : '';
};

const pickImage = (item) => {
  const mediaContent = asArray(item?.['media:content'])[0];
  if (mediaContent?.['@_url']) return mediaContent['@_url'];

  const enclosure = asArray(item?.enclosure)[0];
  if (enclosure?.['@_url']) return enclosure['@_url'];

  const mediaThumbnail = asArray(item?.['media:thumbnail'])[0];
  if (mediaThumbnail?.['@_url']) return mediaThumbnail['@_url'];

  return null;
};

export default async function handler(req, res) {
  const feedParam = Array.isArray(req.query.feed) ? req.query.feed[0] : req.query.feed;

  if (!feedParam) {
    return res.status(400).json({ status: 'error', message: 'Falta parametro feed' });
  }

  let feedUrl;
  try {
    feedUrl = decodeURIComponent(feedParam);
  } catch {
    return res.status(400).json({ status: 'error', message: 'Feed invalido' });
  }

  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsApp/1.0)' },
    });

    if (!response.ok) {
      res.setHeader('Cache-Control', 's-maxage=300');
      return res.status(200).json({
        status: 'ok',
        results: [],
        message: `Feed no disponible (HTTP ${response.status})`,
      });
    }

    const xml = await response.text();
    const parsed = parser.parse(xml);

    const channel = parsed?.rss?.channel || parsed?.feed;
    if (!channel) {
      res.setHeader('Cache-Control', 's-maxage=300');
      return res.status(200).json({ status: 'ok', results: [], message: 'Formato RSS no reconocido' });
    }
    const items = channel?.item || channel?.entry || [];
    const itemArray = asArray(items);

    const sourceName = pickText(channel?.title) || new URL(feedUrl).hostname;
    const sourceDomain = new URL(feedUrl).hostname;

    const results = itemArray.slice(0, 20).map((item) => ({
      title: pickText(item?.title),
      link: pickLink(item),
      pubDate: item?.pubDate || item?.published || item?.updated || '',
      description: pickText(item?.description) || pickText(item?.summary) || pickText(item?.['content:encoded']),
      image_url: pickImage(item),
      source_name: sourceName,
      source_domain: sourceDomain,
      source_id: sourceDomain,
    }));

    res.setHeader('Cache-Control', 's-maxage=300');
    return res.status(200).json({ status: 'ok', results });
  } catch (error) {
    res.setHeader('Cache-Control', 's-maxage=120');
    return res.status(200).json({
      status: 'ok',
      results: [],
      message: error.message || 'No se pudo consultar el feed RSS',
    });
  }
}
