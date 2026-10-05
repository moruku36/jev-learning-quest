'use strict';

function parseAnthropicNewsroom(html, source = { url: 'https://www.anthropic.com/news' }) {
  const items = [];
  const anchorPattern = /<a\b([^>]*href="([^"]*\/news\/[^"]+)"[^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of String(html || '').matchAll(anchorPattern)) {
    const href = decodeEntities(match[2]);
    const body = match[3];
    const url = new URL(href, source.url);
    if (url.hostname !== 'www.anthropic.com' || !url.pathname.startsWith('/news/')) continue;

    const dateText = extractTag(body, /<time\b[^>]*>([\s\S]*?)<\/time>/i);
    const category = extractSpanClass(body, '__subject');
    const title = extractSpanClass(body, '__title');
    const publishedAt = parsePublicationDate(dateText);
    if (!title || !Number.isFinite(publishedAt)) continue;

    items.push({
      source: source.name || 'Anthropic Newsroom',
      sourceId: source.id || 'anthropic-newsroom',
      sourceCategory: category || null,
      title,
      summary: '',
      url: url.href,
      publishedAt: new Date(publishedAt).toISOString()
    });
  }
  return items;
}

function parsePublicationDate(value) {
  const match = /\b([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\b/.exec(String(value || ''));
  if (match) {
    const month = new Date(`${match[1]} 1, 2000`).getMonth();
    if (Number.isFinite(month)) return Date.UTC(Number(match[3]), month, Number(match[2]));
  }
  return Date.parse(value);
}

function extractSpanClass(html, classSuffix) {
  const pattern = /<span\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/span>/gi;
  for (const match of String(html || '').matchAll(pattern)) {
    if (match[1].includes(classSuffix)) return cleanText(match[2]);
  }
  return '';
}

function extractTag(html, regex) {
  const match = regex.exec(String(html || ''));
  return match ? cleanText(match[1]) : '';
}

function cleanText(value) {
  return decodeEntities(String(value || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function decodeEntities(value) {
  const decodeCodePoint = value => {
    const codePoint = Number(value);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : '\uFFFD';
  };
  return String(value || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => decodeCodePoint(code))
    .replace(/&#x([\da-f]+);/gi, (_, code) => decodeCodePoint(parseInt(code, 16)));
}

module.exports = { parseAnthropicNewsroom };
