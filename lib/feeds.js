// AI 大手の公式ブログ・arXiv から新着を取得する（RSS / Atom）
// 取得先は下の固定リストだけ（利用者が URL を指定することはできない）。
// 結果はサーバーのメモリに数時間キャッシュし、各サイトに負荷をかけないようにする。
const FEED_SOURCES = [
  { id: 'openai', name: 'OpenAI', url: 'https://openai.com/news/rss.xml' },
  { id: 'deepmind', name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
  { id: 'google-research', name: 'Google Research', url: 'https://research.google/blog/rss/' },
  { id: 'google-ai', name: 'Google AI', url: 'https://blog.google/technology/ai/rss/' },
  { id: 'microsoft-security', name: 'Microsoft Security', url: 'https://www.microsoft.com/en-us/security/blog/feed/' },
  {
    id: 'arxiv-llm-security',
    name: 'arXiv（LLM × セキュリティ）',
    url: 'https://export.arxiv.org/api/query?search_query=cat:cs.CR+AND+abs:%22language+model%22&sortBy=submittedDate&sortOrder=descending&max_results=10'
  }
];

const FEED_TIMEOUT_MS = 8000;
const FEED_MAX_BYTES = 3 * 1024 * 1024;
const FEED_CACHE_MS = 6 * 60 * 60 * 1000;
const ITEMS_PER_SOURCE = 6;

let cache = null; // { fetchedAt, items, errors }

// 自動テストでは外部サイトに触れないよう、モックのフィードだけを読む
function defaultSources() {
  const testUrl = process.env.LQ_TEST_FEED_URL;
  return testUrl ? [{ id: 'test', name: 'Test Feed', url: testUrl }] : FEED_SOURCES;
}

function decodeEntities(text) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

function tagText(block, tag) {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
  return m ? decodeEntities(m[1]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

// RSS 2.0 の <item> と Atom の <entry> の両方を読む
function parseFeed(xml, source) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.map(block => {
    let link = tagText(block, 'link');
    if (!link) {
      const alt = /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i.exec(block) || /<link[^>]*href="([^"]+)"/i.exec(block);
      link = alt ? decodeEntities(alt[1]) : '';
    }
    const date = tagText(block, 'pubDate') || tagText(block, 'published') || tagText(block, 'updated');
    const time = Date.parse(date);
    return {
      source: source.name,
      sourceId: source.id,
      title: tagText(block, 'title').slice(0, 300),
      summary: (tagText(block, 'description') || tagText(block, 'summary')).slice(0, 300),
      url: link.trim(),
      publishedAt: Number.isNaN(time) ? null : new Date(time).toISOString()
    };
  }).filter(item => item.title && /^https:\/\//.test(item.url));
}

async function fetchSource(source, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetchImpl(source.url, {
      headers: { 'User-Agent': 'JevLearningQuest/1.5 (+https://todays-learning-quest.vercel.app)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      redirect: 'follow',
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > FEED_MAX_BYTES) throw new Error('too large');
    return parseFeed(text, source)
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, ITEMS_PER_SOURCE);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 各サイトの新着をまとめて返す（キャッシュがあればそれを返す）
 * @param {{force?: boolean, fetchImpl?: Function, sources?: Array}} [options]
 */
async function getAiFeed({ force = false, fetchImpl = fetch, sources = defaultSources() } = {}) {
  if (!force && cache && Date.now() - cache.fetchedAt < FEED_CACHE_MS) return cache;
  const results = await Promise.allSettled(sources.map(s => fetchSource(s, fetchImpl)));
  const items = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value);
    else errors.push(sources[i].name);
  });
  items.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  cache = { fetchedAt: Date.now(), items, errors };
  return cache;
}

module.exports = { getAiFeed, parseFeed, FEED_SOURCES };
