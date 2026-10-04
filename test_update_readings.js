'use strict';

const assert = require('node:assert/strict');
const { planRotation, isValidCandidateDate, describeShortfall, isEventListing } = require('./lib/content/reading-rotation');
const { CONFERENCE_READINGS } = require('./lib/content/conference-readings');

const now = new Date('2026-10-04T23:00:00Z');
const existing = Array.from({ length: 36 }, (_, index) => ({
  id: `old-${index}`,
  title: `Existing item ${index}`,
  year: 2017 + (index % 10),
  url: `https://example.org/existing-${index}`,
  kind: 'paper'
}));
function candidate(index, overrides = {}) {
  return {
    id: `new-${index}`,
    title: `New item ${index}`,
    year: 2026,
    url: `https://example.org/new-${index}`,
    kind: 'report',
    publishedAt: '2026-09-01T00:00:00.000Z',
    ...overrides
  };
}

// Eight eligible additions replace exactly eight items; old metadata and order survive.
{
  const plan = planRotation(existing, Array.from({ length: 8 }, (_, i) => candidate(i)), { now });
  assert.equal(plan.added.length, 8);
  assert.equal(plan.removed.length, 8);
  assert.equal(plan.retained.length, 28);
  assert.equal(plan.finalList.length, 36);
  assert.equal(plan.shortfall, 0);
  assert.equal(plan.finalList.at(-1).id, plan.retained.at(-1).id);
}

// Short feeds replace only what they supply; no feed results retain everything.
{
  const three = planRotation(existing, [candidate(0), candidate(1), candidate(2)], { now });
  assert.equal(three.added.length, 3);
  assert.equal(three.removed.length, 3);
  assert.equal(three.retained.length, 33);
  assert.equal(three.finalList.length, 36);
  assert.equal(three.shortfall, 5);

  const none = planRotation(existing, [], { now });
  assert.equal(none.added.length, 0);
  assert.equal(none.removed.length, 0);
  assert.equal(none.retained.length, 36);
  assert.deepEqual(none.finalList, existing);
  assert.equal(none.shortfall, 8);
  assert.match(describeShortfall(none, 8, 8), /all 8 RSS sources failed/);
  assert.match(describeShortfall(none, 0, 8), /only 0 eligible candidates/);
}

// An undersized catalog fills toward the target without dropping any retained item.
{
  const plan = planRotation(existing.slice(0, 32), Array.from({ length: 8 }, (_, i) => candidate(i)), { now });
  assert.equal(plan.removed.length, 4);
  assert.equal(plan.finalList.length, 36);
}

// Duplicate URL/title, missing dates, future dates, and stale sources are ineligible.
{
  const plan = planRotation(existing, [
    candidate(0, { url: `${existing[0].url}/` }),
    candidate(1, { title: existing[1].title.toUpperCase() }),
    candidate(2, { publishedAt: null }),
    candidate(3, { publishedAt: '2026-10-05T00:00:00.000Z' }),
    candidate(4, { publishedAt: '2025-01-01T00:00:00.000Z' })
  ], { now });
  assert.equal(plan.added.length, 0);
  assert.equal(plan.removed.length, 0);
  assert.equal(plan.retained.length, 36);
}

// Repeated slugs remain deterministic and unique instead of random ID collisions.
{
  const plan = planRotation(existing, [candidate(1, { id: 'same' }), candidate(2, { id: 'same' })], { now });
  assert.deepEqual(plan.added.map(item => item.id), ['same', 'same-2']);
}

// Conference coverage requires dated, first-party reading content; event listings alone do not qualify.
{
  assert.equal(CONFERENCE_READINGS.length, 8);
  assert.ok(CONFERENCE_READINGS.every(item => item.evidenceType === 'conference_poster_abstract'));
  assert.ok(CONFERENCE_READINGS.every(item => item.url.startsWith('https://aivillage.org/posters/')));
  assert.ok(CONFERENCE_READINGS.every(item => isValidCandidateDate(item, now, 365)));
  const plan = planRotation(existing, CONFERENCE_READINGS, { now, maxNewItems: 8, maxPerEvidenceType: 3 });
  assert.equal(plan.added.length, 3);
  assert.equal(plan.removed.length, 3);
  assert.equal(plan.finalList.length, 36);
  assert.equal(plan.shortfall, 5);
  assert.match(describeShortfall(plan, 8, 8), /8 eligible candidates were found/);
  assert.ok(plan.added.every(item => item.eventStartDate && item.eventEndDate && item.lastVerifiedAt));
  assert.ok(isEventListing('Secure what’s next: Your guide to Microsoft Security at Microsoft Ignite 2026'));
  assert.ok(isEventListing('Conference schedule and registration'));
  assert.equal(isEventListing('Threat intelligence report: lessons from the 2026 conference'), false);
}

console.log('Reading rotation fixtures passed.');
