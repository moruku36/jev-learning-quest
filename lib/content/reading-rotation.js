'use strict';

function planRotation(existingReadings, candidates, options = {}) {
  const targetCount = options.targetCount ?? 36;
  const maxNewItems = options.maxNewItems ?? 8;
  const existingUrls = new Set(existingReadings.map(item => normalize(item.url)));
  const existingTitles = new Set(existingReadings.map(item => normalizeTitle(item.title)));
  const existingIds = new Set(existingReadings.map(item => item.id));
  const seenUrls = new Set();
  const seenTitles = new Set();
  const seenIds = new Set();
  const eligible = [];

  for (const candidate of candidates) {
    if (!candidate || !candidate.id || !candidate.title || !candidate.url) continue;
    const url = normalize(candidate.url);
    const title = normalizeTitle(candidate.title);
    if (existingUrls.has(url) || existingTitles.has(title) || seenUrls.has(url) || seenTitles.has(title)) continue;
    if (!isValidCandidateDate(candidate, options.now ?? new Date(), options.maxAgeDays ?? 365)) continue;
    let id = candidate.id;
    if (existingIds.has(id) || seenIds.has(id)) {
      let suffix = 2;
      while (existingIds.has(`${id}-${suffix}`) || seenIds.has(`${id}-${suffix}`)) suffix += 1;
      id = `${id}-${suffix}`;
    }
    seenUrls.add(url);
    seenTitles.add(title);
    seenIds.add(id);
    eligible.push({ ...candidate, id });
  }

  const added = [];
  const evidenceTypeCounts = new Map();
  for (const item of eligible) {
    if (added.length >= maxNewItems) break;
    const evidenceType = item.evidenceType;
    const limit = options.maxPerEvidenceType ?? Infinity;
    if (evidenceType && (evidenceTypeCounts.get(evidenceType) || 0) >= limit) continue;
    added.push(item);
    if (evidenceType) evidenceTypeCounts.set(evidenceType, (evidenceTypeCounts.get(evidenceType) || 0) + 1);
  }
  // Every removal is paid for by a new, eligible item. This avoids shrinking
  // the list after a short feed or a failed source, even when above target.
  const removeCount = Math.min(added.length, Math.max(0, existingReadings.length + added.length - targetCount));
  const oldestFirst = existingReadings
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (Number(a.item.year) || 0) - (Number(b.item.year) || 0) || b.index - a.index);
  const removeIndexes = new Set(oldestFirst.slice(0, removeCount).map(entry => entry.index));
  const removed = [];
  const retained = [];
  existingReadings.forEach((item, index) => (removeIndexes.has(index) ? removed : retained).push(item));
  return {
    added,
    removed,
    retained,
    finalList: [...added, ...retained],
    eligibleCount: eligible.length,
    shortfall: Math.max(0, maxNewItems - added.length)
  };
}

function describeShortfall(plan, failedSourceCount, totalSources) {
  if (!plan.shortfall) return '';
  const failures = failedSourceCount === totalSources
    ? `all ${totalSources} RSS sources failed`
    : failedSourceCount > 0
      ? `${failedSourceCount} of ${totalSources} RSS sources failed`
      : '';
  const availability = plan.eligibleCount > plan.added.length
    ? `${plan.eligibleCount} eligible candidates were found; ${plan.eligibleCount - plan.added.length} did not fit the weekly/item-evidence limits`
    : `only ${plan.added.length} eligible candidates were available`;
  return [failures, availability].filter(Boolean).join('; ');
}

function isEventListing(text) {
  return /(?:\bcall for papers\b|\bevent guide\b|\bschedule\b|\bagenda\b|\bregistration\b|\bregister now\b|\bconference program\b|\bsessions list\b|guide to.{0,80}\b(?:conference|summit|ignite)\b)/i.test(String(text || ''));
}

function isValidCandidateDate(candidate, now, maxAgeDays) {
  const date = candidate.publishedAt || candidate.eventEndDate;
  if (!date) return false;
  const time = Date.parse(date);
  if (!Number.isFinite(time) || time > now.getTime()) return false;
  const start = Date.parse(candidate.publishedAt || candidate.eventStartDate || date);
  return Number.isFinite(start) && start <= now.getTime() && now.getTime() - start <= maxAgeDays * 24 * 60 * 60 * 1000;
}

function normalize(value) {
  return String(value || '').trim().replace(/#.*$/, '').replace(/\/$/, '').toLowerCase();
}

function normalizeTitle(value) {
  return String(value || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

module.exports = { planRotation, isValidCandidateDate, describeShortfall, isEventListing };
