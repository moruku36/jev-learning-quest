'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { planRotation, isValidCandidateDate, describeShortfall, isEventListing } = require('./lib/content/reading-rotation');
const { CONFERENCE_READINGS } = require('./lib/content/conference-readings');
const { assessImpact, publisherGroup } = require('./lib/content/impact-assessment');
const { parseAnthropicNewsroom } = require('./lib/content/anthropic-newsroom');
const {
  normalizeContentUrl,
  lookupHackerNewsSignal,
  enrichWithCommunitySignals,
  sortByPrimaryAndObservedCommunity
} = require('./lib/content/community-signals');
const { validateExpectedFeed, validateExpectedAnthropicNewsroom } = require('./lib/content/source-validation');
const { main: runUpdater } = require('./scripts/update-readings');
const {
  getJstWeekKey, readWeeklyState, isWeekUpdated, recordWeekUpdate,
  appendWorkflowOutput, isWeeklyUpdateComplete
} = require('./lib/content/weekly-run-guard');

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

// Publisher diversity is enforced after ranking; the cap never forces removals beyond additions.
{
  const openAiOnly = planRotation(existing, Array.from({ length: 8 }, (_, i) => candidate(i, { org: 'OpenAI' })), {
    now, maxPerPublisher: 4
  });
  assert.equal(openAiOnly.added.length, 4);
  assert.equal(openAiOnly.removed.length, 4);
  assert.equal(openAiOnly.finalList.length, 36);
  assert.match(describeShortfall(openAiOnly, 0, 8), /publisher/);

  const balanced = planRotation(existing, [
    ...Array.from({ length: 8 }, (_, i) => candidate(i, { org: 'OpenAI' })),
    ...Array.from({ length: 4 }, (_, i) => candidate(i + 8, { org: 'Anthropic' }))
  ], { now, maxPerPublisher: 4 });
  assert.equal(balanced.added.length, 8);
  assert.equal(balanced.removed.length, 8);
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
  assert.match(describeShortfall(none, 8, 8), /all 8 configured sources failed/);
  assert.match(describeShortfall(none, 0, 8), /only 0 eligible candidates/);
}

// Week keys use JST Monday boundaries and completion requires all eight picks with no source errors.
{
  assert.equal(getJstWeekKey(new Date('2026-10-04T14:59:59Z')), '2026-09-28');
  assert.equal(getJstWeekKey(new Date('2026-10-04T15:00:00Z')), '2026-10-05');
  assert.equal(getJstWeekKey(new Date('2026-10-05T00:00:00Z')), '2026-10-05');
  assert.equal(isWeeklyUpdateComplete(8, 0), true);
  assert.equal(isWeeklyUpdateComplete(7, 0), false);
  assert.equal(isWeeklyUpdateComplete(8, 1), false);
  assert.equal(isWeeklyUpdateComplete(0, 0), false);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reading-week-state-'));
  try {
    const stateFile = path.join(tempDir, 'state.json');
    assert.equal(isWeekUpdated(stateFile, '2026-10-05'), false);
    recordWeekUpdate(stateFile, {
      weekKey: '2026-10-05', status: 'partial', updatedAt: new Date('2026-10-05T00:20:00Z'),
      additions: 3, removals: 3, sourceFailures: ['OpenAI']
    });
    assert.equal(isWeekUpdated(stateFile, '2026-10-05'), true);
    assert.equal(isWeekUpdated(stateFile, '2026-10-12'), false);
    assert.equal(readWeeklyState(stateFile).status, 'partial');
    assert.equal(readWeeklyState(stateFile).additions, 3);
    assert.equal(readWeeklyState(stateFile).timeZone, 'Asia/Tokyo');

    const outputFile = path.join(tempDir, 'github-output.txt');
    appendWorkflowOutput(outputFile, 'week_state', 'partial');
    assert.equal(fs.readFileSync(outputFile, 'utf8'), 'week_state=partial\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // Any changed catalog gets a same-week marker, whether it completed fully or partially.
  {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reading-update-state-'));
  try {
    const stateFile = path.join(tempDir, 'state.json');
    for (const status of ['partial', 'complete']) {
      recordWeekUpdate(stateFile, {
        weekKey: '2026-10-05', status, updatedAt: new Date('2026-10-05T00:20:00Z'),
        additions: status === 'complete' ? 8 : 3, removals: status === 'complete' ? 8 : 3,
        sourceFailures: status === 'complete' ? [] : ['arXiv']
      });
      assert.equal(isWeekUpdated(stateFile, '2026-10-05'), true);
      assert.equal(readWeeklyState(stateFile).status, status);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  }
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

// Anthropic's first-party newsroom parser preserves title, category, publication date, and source URL.
{
  const html = `<a href="/news/claude-security-update"><time>Oct 2, 2026</time><span class="NewsCard__subject">Security</span><span class="NewsCard__title">Claude &amp; security update</span></a>
    <a href="https://example.org/news/fake"><time>Oct 2, 2026</time><span class="NewsCard__title">Ignore</span></a>
    <a href="/news/bad-date"><time>not a date</time><span class="NewsCard__title">Ignore</span></a>`;
  const items = parseAnthropicNewsroom(html, { url: 'https://www.anthropic.com/news', name: 'Anthropic Newsroom' });
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Claude & security update');
  assert.equal(items[0].sourceCategory, 'Security');
  assert.equal(items[0].publishedAt, '2026-10-02T00:00:00.000Z');
  assert.equal(items[0].url, 'https://www.anthropic.com/news/claude-security-update');
  assert.equal(parseAnthropicNewsroom('<a href="/news/test"><span class="NewsCard__title">Broken &#x110000;</span><time>Oct 1, 2026</time></a>').length, 1);
}

// Impact evidence records exact source text and dates; it does not invent community metrics.
{
  const assessedAt = new Date('2026-10-05T00:00:00Z');
  const assessment = assessImpact({
    org: 'Anthropic',
    title: 'Anthropic trains 10,000 engineers on security and Claude',
    summary: 'Deployed across production teams.',
    url: 'https://www.anthropic.com/news/example'
  }, {}, assessedAt);
  assert.equal(assessment.score, 60);
  assert.equal(assessment.evidenceUrl, 'https://www.anthropic.com/news/example');
  assert.equal(assessment.assessedAt, assessedAt.toISOString());
  assert.equal(assessment.communityMetrics, 'not_collected_from_source');
  assert.equal(assessment.signals.find(signal => signal.type === 'explicit_scale_claim').evidence, '10,000 engineers');
  assert.equal(publisherGroup('Google DeepMind'), 'google');
}

// Source validation distinguishes a valid empty XML feed from an HTML challenge or parser drift.
{
  const validEmpty = '<?xml version="1.0"?><rss version="2.0"><channel><title>Example</title></channel></rss>';
  assert.equal(validateExpectedFeed(validEmpty), true);
  assert.equal(validateExpectedFeed('<html><body>Access denied</body></html>'), false);
  assert.equal(validateExpectedFeed('<rss><channel><item><title>broken</rss>'), false);
  assert.equal(validateExpectedAnthropicNewsroom('<html><a href="/news/one"><span class="Card__title">News</span></a></html>'), true);
  assert.equal(validateExpectedAnthropicNewsroom('<html><body>challenge</body></html>'), false);
}

// Community counts require exact normalized article URL identity and an official HN story record.
async function testCommunitySignals() {
{
  const articleUrl = 'https://example.org/security/report?edition=2&utm_source=newsletter';
  assert.equal(normalizeContentUrl(articleUrl), 'https://example.org/security/report?edition=2');
  assert.equal(normalizeContentUrl(articleUrl), normalizeContentUrl('https://example.org/security/report?utm_medium=email&edition=2#section'));
  assert.notEqual(normalizeContentUrl(articleUrl), normalizeContentUrl('https://example.org/security/report?edition=3'));
  let calls = 0;
  const fetchImpl = async url => {
    calls += 1;
    if (url.startsWith('https://hn.algolia.com/')) {
      return { ok: true, text: async () => JSON.stringify({ hits: [
        { objectID: '101', url: 'https://example.org/security/report-extra?edition=2', created_at_i: 300 },
        { objectID: '102', url: 'https://example.org/security/report?edition=2&utm_campaign=old', created_at_i: 200 },
        { objectID: '103', url: articleUrl, created_at_i: 100 }
      ] }) };
    }
    return { ok: true, text: async () => JSON.stringify({
      id: 102, type: 'story', url: 'https://example.org/security/report?edition=2&utm_term=hn', score: 47, descendants: 12
    }) };
  };
  const signal = await lookupHackerNewsSignal(articleUrl, { fetchImpl, now: new Date('2026-10-05T00:00:00Z') });
  assert.equal(calls, 2);
  assert.equal(signal.status, 'observed');
  assert.equal(signal.storyId, '102');
  assert.equal(signal.points, 47);
  assert.equal(signal.comments, 12);
  assert.match(signal.pointsUnit, /not a person count/);
  assert.equal(signal.evidenceUrl, 'https://news.ycombinator.com/item?id=102');

  const missing = await lookupHackerNewsSignal(articleUrl, {
    fetchImpl: async () => ({ ok: true, text: async () => JSON.stringify({ hits: [] }) }),
    now: new Date('2026-10-05T00:00:00Z')
  });
  assert.equal(missing.status, 'unknown');
  assert.equal(missing.reason, 'no_exact_url_match');
  const timedOut = await lookupHackerNewsSignal(articleUrl, {
    timeoutMs: 5,
    fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('timeout fixture')), { once: true });
    }),
    now: new Date('2026-10-05T00:00:00Z')
  });
  assert.equal(timedOut.status, 'unknown');
  assert.match(timedOut.reason, /lookup_failed/);

  const capped = await enrichWithCommunitySignals(Array.from({ length: 4 }, (_, index) => ({
    id: `community-${index}`, url: `https://example.org/${index}`, score: 10
  })), {
    maxLookups: 2,
    now: new Date('2026-10-05T00:00:00Z'),
    lookup: async url => ({ source: 'Hacker News', status: 'observed', linkedUrl: url, points: 1, comments: 1 })
  });
  assert.equal(capped.filter(item => item.communitySignals[0].status === 'observed').length, 2);
  assert.equal(capped.slice(2).every(item => item.communitySignals[0].reason === 'lookup_limit'), true);

  const sorted = sortByPrimaryAndObservedCommunity([
    { id: 'unknown', score: 10, publishedAt: '2026-10-03', communitySignals: [{ status: 'unknown' }] },
    { id: 'lower-points', score: 10, publishedAt: '2026-10-02', communitySignals: [{ status: 'observed', points: 3, comments: 1 }] },
    { id: 'higher-points', score: 10, publishedAt: '2026-10-01', communitySignals: [{ status: 'observed', points: 30, comments: 2 }] }
  ]);
  assert.deepEqual(sorted.map(item => item.id), ['unknown', 'higher-points', 'lower-points']);
}
}

// The actual updater entrypoint keeps no-candidate, partial-retry, and source-failure outcomes distinct.
async function testUpdaterIntegration() {
await testCommunitySignals();
{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reading-updater-integration-'));
  const nowAt = new Date('2026-10-05T01:00:00Z');
  const validEmptyFeed = '<?xml version="1.0"?><rss version="2.0"><channel><title>Example</title></channel></rss>';
  const makeFeed = (title, url) => `<?xml version="1.0"?><rss version="2.0"><channel><title>Example</title><item><title>${title}</title><description>AI security research analysis</description><link>${url}</link><pubDate>Sun, 04 Oct 2026 00:00:00 GMT</pubDate></item></channel></rss>`;
  const source = { id: 'fixture', name: 'Fixture Feed', org: 'Fixture Publisher', url: 'https://fixture.example/feed.xml', format: 'feed' };
  const unknownHn = async url => ({
    source: 'Hacker News', status: 'unknown', reason: 'fixture_no_match', linkedUrl: url,
    observedAt: nowAt.toISOString(), pointsUnit: 'unknown'
  });

  try {
    // A successful empty feed is not a successful weekly update and causes no file or state write.
    {
      const targetFile = path.join(tempDir, 'empty-catalog.js');
      const stateFile = path.join(tempDir, 'empty-state.json');
      const outputFile = path.join(tempDir, 'empty-output.txt');
      let writes = 0;
      await runUpdater({
        dryRun: false, weekKey: '2026-10-05', now: () => nowAt,
        sources: [source], existingReadings: existing, conferenceReadings: [],
        targetFile, weekStateFile: stateFile, githubOutputPath: outputFile,
        fetchImpl: async () => ({ ok: true, text: async () => validEmptyFeed }),
        communityLookup: unknownHn,
        writeFile: (...args) => { writes += 1; fs.writeFileSync(...args); }
      });
      assert.equal(writes, 0);
      assert.equal(fs.existsSync(targetFile), false);
      assert.equal(fs.existsSync(stateFile), false);
      assert.match(fs.readFileSync(outputFile, 'utf8'), /week_state=no-eligible-candidates/);
    }

    // A partial write is marked; the second same-week entrypoint call returns before any fetch or write.
    {
      const targetFile = path.join(tempDir, 'partial-catalog.js');
      const stateFile = path.join(tempDir, 'partial-state.json');
      let fetches = 0;
      let writes = 0;
      const options = {
        dryRun: false, weekKey: '2026-10-05', now: () => nowAt,
        sources: [source], existingReadings: existing, conferenceReadings: [],
        targetFile, weekStateFile: stateFile, communityLookup: unknownHn,
        fetchImpl: async () => { fetches += 1; return { ok: true, text: async () => makeFeed('AI Security field analysis', 'https://fixture.example/security/new') }; },
        writeFile: (...args) => { writes += 1; fs.writeFileSync(...args); }
      };
      await runUpdater(options);
      assert.equal(readWeeklyState(stateFile).status, 'partial');
      assert.equal(readWeeklyState(stateFile).additions, 1);
      await runUpdater(options);
      assert.equal(fetches, 1);
      assert.equal(writes, 1);
    }

    // Eight picks plus one failed configured source produce a partial state, never a complete state.
    {
      const targetFile = path.join(tempDir, 'failed-source-catalog.js');
      const stateFile = path.join(tempDir, 'failed-source-state.json');
      const sources = Array.from({ length: 8 }, (_, index) => ({
        id: `fixture-${index}`, name: `Fixture ${index}`, org: `Publisher ${index}`,
        url: `https://fixture-${index}.example/feed.xml`, format: 'feed'
      }));
      sources.push({ id: 'fixture-fails', name: 'Fixture failure', org: 'Publisher failure', url: 'https://failure.example/feed.xml', format: 'feed' });
      let index = 0;
      await runUpdater({
        dryRun: false, weekKey: '2026-10-05', now: () => nowAt,
        sources, existingReadings: existing, conferenceReadings: [],
        targetFile, weekStateFile: stateFile, communityLookup: unknownHn, maxCommunityLookups: 0,
        fetchImpl: async () => {
          const current = index++;
          if (current === 8) throw new Error('fixture network failure');
          return { ok: true, text: async () => makeFeed(`AI security analysis ${current}`, `https://fixture-${current}.example/security/report`) };
        }
      });
      const state = readWeeklyState(stateFile);
      assert.equal(state.additions, 8);
      assert.equal(state.removals, 8);
      assert.equal(state.status, 'partial');
      assert.deepEqual(state.sourceFailures, ['Fixture failure']);
    }

    // Eight additions with all configured sources valid produce complete state and a second-run no-op.
    {
      const targetFile = path.join(tempDir, 'complete-catalog.js');
      const stateFile = path.join(tempDir, 'complete-state.json');
      const sources = Array.from({ length: 8 }, (_, index) => ({
        id: `complete-${index}`, name: `Complete ${index}`, org: `Complete Publisher ${index}`,
        url: `https://complete-${index}.example/feed.xml`, format: 'feed'
      }));
      let fetches = 0;
      const options = {
        dryRun: false, weekKey: '2026-10-05', now: () => nowAt,
        sources, existingReadings: existing, conferenceReadings: [], targetFile, weekStateFile: stateFile,
        communityLookup: unknownHn, maxCommunityLookups: 0,
        fetchImpl: async (_url) => {
          const index = fetches++;
          return { ok: true, text: async () => makeFeed(`AI security complete analysis ${index}`, `https://complete-${index}.example/security/report`) };
        }
      };
      await runUpdater(options);
      assert.equal(readWeeklyState(stateFile).status, 'complete');
      assert.equal(readWeeklyState(stateFile).additions, 8);
      assert.equal(readWeeklyState(stateFile).sourceFailures.length, 0);
      await runUpdater(options);
      assert.equal(fetches, 8);
    }

    // HTTP 200 containing a challenge page is classified as a source failure, not a normal empty feed.
    {
      const stateFile = path.join(tempDir, 'challenge-state.json');
      const outputFile = path.join(tempDir, 'challenge-output.txt');
      await runUpdater({
        dryRun: false, weekKey: '2026-10-05', now: () => nowAt,
        sources: [source], existingReadings: existing, conferenceReadings: [],
        targetFile: path.join(tempDir, 'challenge-catalog.js'), weekStateFile: stateFile,
        githubOutputPath: outputFile,
        fetchImpl: async () => ({ ok: true, text: async () => '<html><body>Access denied</body></html>' }),
        communityLookup: unknownHn
      });
      assert.equal(fs.existsSync(stateFile), false);
      assert.match(fs.readFileSync(outputFile, 'utf8'), /week_state=source-failures-no-candidates/);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

}

testUpdaterIntegration().then(() => {
  console.log('Reading rotation fixtures passed.');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
