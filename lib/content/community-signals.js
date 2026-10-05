'use strict';

const HN_SEARCH_BASE = 'https://hn.algolia.com/api/v1/search_by_date';
const HN_ITEM_BASE = 'https://hacker-news.firebaseio.com/v0/item/';
const HN_SEARCH_DOC = 'https://github.com/algolia/hn-search';
const HN_API_DOC = 'https://github.com/HackerNews/API';
const HN_REQUEST_TIMEOUT_MS = 2500;

function normalizeContentUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ['gclid', 'fbclid', 'mc_cid', 'mc_eid'].includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    return `${url.protocol}//${url.host}${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

async function fetchJsonWithTimeout(url, fetchImpl, timeoutMs = HN_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > 256 * 1024) throw new Error('JSON response exceeded 256 KiB limit');
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

function unknownSignal(reason, observedAt, linkedUrl) {
  return {
    source: 'Hacker News',
    status: 'unknown',
    reason,
    linkedUrl,
    observedAt: observedAt.toISOString(),
    pointsUnit: 'unknown'
  };
}

async function lookupHackerNewsSignal(articleUrl, {
  fetchImpl = fetch,
  now = () => new Date(),
  timeoutMs = HN_REQUEST_TIMEOUT_MS
} = {}) {
  const observedAt = () => typeof now === 'function' ? now() : now;
  const normalizedArticleUrl = normalizeContentUrl(articleUrl);
  if (!normalizedArticleUrl) return unknownSignal('invalid_article_url', observedAt(), articleUrl);

  try {
    const searchUrl = new URL(HN_SEARCH_BASE);
    searchUrl.searchParams.set('query', normalizedArticleUrl);
    searchUrl.searchParams.set('tags', 'story');
    searchUrl.searchParams.set('hitsPerPage', '20');
    const search = await fetchJsonWithTimeout(searchUrl.href, fetchImpl, timeoutMs);
    if (!Array.isArray(search.hits)) throw new Error('HN search response has no hits array');

    const exactHits = search.hits.filter(hit =>
      normalizeContentUrl(hit.url) === normalizedArticleUrl
      && /^\d+$/.test(String(hit.objectID || ''))
    );
    if (exactHits.length === 0) return unknownSignal('no_exact_url_match', observedAt(), articleUrl);

    // Select one HN story deterministically; never sum reposts of the same article URL.
    exactHits.sort((a, b) => Number(b.created_at_i || 0) - Number(a.created_at_i || 0));
    const storyId = String(exactHits[0].objectID);
    const story = await fetchJsonWithTimeout(`${HN_ITEM_BASE}${storyId}.json`, fetchImpl, timeoutMs);
    if (String(story?.id) !== storyId || story?.type !== 'story' || normalizeContentUrl(story.url) !== normalizedArticleUrl) {
      return unknownSignal('official_item_identity_or_url_mismatch', observedAt(), articleUrl);
    }
    if (!Number.isFinite(story.score) || !Number.isFinite(story.descendants)) {
      return unknownSignal('official_item_metrics_missing', observedAt(), articleUrl);
    }

    return {
      source: 'Hacker News',
      status: 'observed',
      linkedUrl: articleUrl,
      storyId,
      evidenceUrl: `https://news.ycombinator.com/item?id=${storyId}`,
      observedAt: observedAt().toISOString(),
      points: story.score,
      comments: story.descendants,
      pointsUnit: 'Hacker News story points; not a person count',
      metricDefinition: 'comments is the official API descendants count',
      lookupSources: [HN_SEARCH_DOC, HN_API_DOC]
    };
  } catch (error) {
    return unknownSignal(`lookup_failed:${error.message}`, observedAt(), articleUrl);
  }
}

async function enrichWithCommunitySignals(candidates, {
  fetchImpl = fetch,
  lookup = lookupHackerNewsSignal,
  now = () => new Date(),
  maxLookups = 12
} = {}) {
  const enriched = candidates.map(candidate => ({ ...candidate }));
  const observedAt = () => typeof now === 'function' ? now() : now;
  for (const candidate of enriched) {
    candidate.communitySignals = [unknownSignal('lookup_limit', observedAt(), candidate.url)];
  }
  const lookupCandidates = enriched.slice(0, maxLookups);
  for (const candidate of lookupCandidates) {
    candidate.communitySignals = [await lookup(candidate.url, { fetchImpl, now: observedAt })];
  }
  return enriched;
}

function sortByPrimaryAndObservedCommunity(candidates) {
  const primarySorted = [...candidates].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    return (b.publishedAt || b.eventEndDate || '').localeCompare(a.publishedAt || a.eventEndDate || '');
  });

  let start = 0;
  while (start < primarySorted.length) {
    let end = start + 1;
    while (end < primarySorted.length && (primarySorted[end].score || 0) === (primarySorted[start].score || 0)) end += 1;
    const observedIndexes = [];
    const observed = [];
    for (let index = start; index < end; index += 1) {
      const signal = primarySorted[index].communitySignals?.find(item => item.status === 'observed');
      if (signal) {
        observedIndexes.push(index);
        observed.push({ candidate: primarySorted[index], signal });
      }
    }
    observed.sort((a, b) => b.signal.points - a.signal.points || b.signal.comments - a.signal.comments);
    observedIndexes.forEach((index, offset) => { primarySorted[index] = observed[offset].candidate; });
    start = end;
  }
  return primarySorted;
}

module.exports = {
  HN_REQUEST_TIMEOUT_MS,
  normalizeContentUrl,
  lookupHackerNewsSignal,
  enrichWithCommunitySignals,
  sortByPrimaryAndObservedCommunity
};
