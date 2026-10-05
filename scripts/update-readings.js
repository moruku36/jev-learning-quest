// scripts/update-readings.js
// AI・クラウド・セキュリティに関する最新情報（公式ブログ・論文・脅威レポート）を取得し、
// 学習教材（lib/content/ai-readings.js）を週次で更新・ローテーションするスクリプト。

const fs = require('fs');
const path = require('path');
const { parseFeed } = require('../lib/feeds');
const { AI_READINGS: existingReadings } = require('../lib/content/ai-readings');
const { planRotation, describeShortfall, isEventListing } = require('../lib/content/reading-rotation');
const { CONFERENCE_READINGS } = require('../lib/content/conference-readings');
const { assessImpact } = require('../lib/content/impact-assessment');
const { parseAnthropicNewsroom } = require('../lib/content/anthropic-newsroom');
const {
  validateExpectedFeed,
  validateExpectedAnthropicNewsroom,
  containsFeedEntries,
  containsAnthropicNewsCards
} = require('../lib/content/source-validation');
const {
  enrichWithCommunitySignals,
  sortByPrimaryAndObservedCommunity
} = require('../lib/content/community-signals');
const {
  getJstWeekKey, readWeeklyState, recordWeekUpdate,
  appendWorkflowOutput, isWeeklyUpdateComplete
} = require('../lib/content/weekly-run-guard');

const TARGET_FILE = path.join(__dirname, '..', 'lib', 'content', 'ai-readings.js');
const WEEK_STATE_FILE = path.join(__dirname, '..', '.github', 'state', 'weekly-content-update.json');
const TARGET_COUNT = 36; // 常に最新36件を維持
const MAX_NEW_ITEMS = 8; // 1回の更新で取り込む最大新規件数
const FETCH_TIMEOUT_MS = 10000;

// AI・クラウド・セキュリティの公式情報源
const SOURCES = [
  { id: 'ms-sec', name: 'Microsoft Security', org: 'Microsoft', url: 'https://www.microsoft.com/en-us/security/blog/feed/', format: 'feed' },
  { id: 'aws-sec', name: 'AWS Security', org: 'AWS', url: 'https://aws.amazon.com/blogs/security/feed/', format: 'feed' },
  { id: 'gcp', name: 'Google Cloud', org: 'Google Cloud', url: 'https://cloudblog.withgoogle.com/rss/', format: 'feed' },
  { id: 'deepmind', name: 'Google DeepMind', org: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', format: 'feed' },
  { id: 'google-ai', name: 'Google AI', org: 'Google', url: 'https://blog.google/technology/ai/rss/', format: 'feed' },
  { id: 'openai', name: 'OpenAI', org: 'OpenAI', url: 'https://openai.com/news/rss.xml', format: 'feed' },
  { id: 'anthropic-newsroom', name: 'Anthropic Newsroom', org: 'Anthropic', url: 'https://www.anthropic.com/news', format: 'anthropic-newsroom' },
  {
    id: 'arxiv-llm-sec',
    name: 'arXiv (LLM Security)',
    org: 'arXiv',
    url: 'https://export.arxiv.org/api/query?search_query=cat:cs.CR+AND+abs:%22language+model%22&sortBy=submittedDate&sortOrder=descending&max_results=10',
    format: 'feed'
  },
  {
    id: 'arxiv-cloud-sec',
    name: 'arXiv (Cloud Security)',
    org: 'arXiv',
    url: 'https://export.arxiv.org/api/query?search_query=cat:cs.CR+AND+(abs:%22cloud%22+OR+abs:%22kubernetes%22)+AND+abs:%22security%22&sortBy=submittedDate&sortOrder=descending&max_results=10',
    format: 'feed'
  }
];

// 教材として不適切なマーケティング・宣伝記事を除外
const EXCLUDE_REGEX = /(?:sales|customer story|customer stories|webinar|quarterly|earnings|pricing|hiring|careers|sponsored|podcast|discount)/i;

// AI・クラウド・セキュリティに関連するキーワード
const SECURITY_REGEX = /(?:security|vulnerab|threat|attack|malware|defense|privacy|red[\s-]team|cve|zero[\s-]day|ransomware|guardrail|safety|auth|breach|jailbreak|prompt[\s-]injection|poisoning|backdoor|exploit|storm-)/i;
const CLOUD_REGEX = /(?:cloud|aws|azure|gcp|kubernetes|iam|container|serverless|s3|vpc|identity|service[\s-]principal)/i;
const AI_REGEX = /(?:ai|llm|agent|model|gpt|claude|gemini|deep[\s-]learning|reasoning|foundation|transformer)/i;

async function fetchWithTimeout(url, headers = {}, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*',
        ...headers
      },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 45);
}

function determineKind(title, summary, org) {
  const text = `${title} ${summary}`.toLowerCase();
  if (org === 'arXiv' || text.includes('arxiv')) return '論文';
  if (/threat|storm-|actor|ransomware|malware|attack|campaign|incident|cve|exploit/i.test(text)) return '脅威レポート';
  if (/framework|guideline|top 10|standard|benchmark|policy/i.test(text)) return 'ガイドライン';
  if (/research|evaluation|experiment|survey|study/i.test(text)) return '研究';
  return '技術ブログ';
}

function determineLevel(kind, title, summary) {
  if (kind === '論文' || kind === '研究') return '中級';
  if (/architecture|internals|advanced|exploit|zero-day|protocol|disassembly/i.test(`${title} ${summary}`)) return '上級';
  return '入門';
}

function generateFocusAndTask(title, summary, kind, org) {
  const cleanSummary = (summary || '').replace(/\s+/g, ' ').trim();
  let focus = '';
  let task = '';

  if (kind === '脅威レポート') {
    focus = cleanSummary.length > 20
      ? `${cleanSummary.slice(0, 160)}...に関する攻撃手法と侵害経路の分析`
      : '攻撃者の手法・侵入経路と、クラウドやAI環境に対する影響・対策';
    task = '報告された攻撃手法の要点を3行でまとめ、自社のクラウド・AI環境で講ずべき防御策を1つ挙げる';
  } else if (kind === '論文' || kind === '研究') {
    focus = cleanSummary.length > 20
      ? `${cleanSummary.slice(0, 160)}...に関する検証結果とセキュリティ上の示唆`
      : 'モデルやシステムの挙動、脆弱性のメカニズムと防御手法の検証';
    task = '研究の要点と得られた教訓を3行で説明し、実務における活用または注意点を1つ書く';
  } else if (org === 'AWS' || org === 'Google Cloud' || org === 'Microsoft') {
    focus = cleanSummary.length > 20
      ? `${cleanSummary.slice(0, 160)}...に関する機能・ベストプラクティス`
      : 'クラウド環境におけるセキュリティ設定・運用改善とリスク低減の手法';
    task = '紹介されたセキュリティ機能やベストプラクティスを確認し、自社クラウド環境への適用可能性を1段落でまとめる';
  } else {
    focus = cleanSummary.length > 20
      ? `${cleanSummary.slice(0, 160)}...のポイントと利用上の安全性`
      : 'AI技術の最新動向と、安全に活用・運用するためのアーキテクチャ設計';
    task = '内容の要点を3つ箇条書きにし、業務でAIを活用する際のセキュリティ上の注意点を1つ書く';
  }

  return { focus, task };
}

function scoreRelevance(item, source) {
  const text = `${item.title} ${item.summary || ''}`;
  let score = 0;

  // セキュリティ専門ソースはベーススコアが高い
  if (source.name.includes('Security') || source.name.includes('arXiv')) score += 10;
  if (SECURITY_REGEX.test(text)) score += 15;
  if (CLOUD_REGEX.test(text)) score += 10;
  if (AI_REGEX.test(text)) score += 10;

  // AIとセキュリティ、あるいはクラウドとセキュリティの複合テーマを最優先
  if (SECURITY_REGEX.test(text) && (AI_REGEX.test(text) || CLOUD_REGEX.test(text))) score += 20;

  return score;
}

async function main(options = {}) {
  const isDryRun = options.dryRun ?? process.argv.includes('--dry-run');
  const weekKey = options.weekKey || getJstWeekKey(options.now?.() || new Date());
  const fetchImpl = options.fetchImpl || fetch;
  const sourceList = options.sources ?? SOURCES;
  const currentReadings = options.existingReadings ?? existingReadings;
  const targetFile = options.targetFile || TARGET_FILE;
  const weekStateFile = options.weekStateFile || WEEK_STATE_FILE;
  const conferenceReadings = options.conferenceReadings ?? CONFERENCE_READINGS;
  const getNow = options.now || (() => new Date());
  const writeFile = options.writeFile || fs.writeFileSync;
  console.log(`[INFO] Starting AI/Cloud/Security readings update (DryRun: ${isDryRun})...`);
  const priorWeekUpdate = readCurrentWeekState(weekKey, weekStateFile);
  if (priorWeekUpdate) {
    console.log(`[INFO] JST week ${weekKey} already has a ${priorWeekUpdate.status} catalog update (${priorWeekUpdate.additions} additions); skipping duplicate run.`);
    appendWorkflowOutput(process.env.GITHUB_OUTPUT, 'week_state', `already-${priorWeekUpdate.status}`);
    return;
  }

  const existingUrls = new Set(currentReadings.map(r => r.url.toLowerCase()));
  const existingTitles = new Set(currentReadings.map(r => r.title.toLowerCase().trim()));

  const candidateItems = [];
  const sourceFailures = [];

  for (const source of sourceList) {
    try {
      console.log(`[FETCH] Fetching from ${source.name}...`);
      const xml = await fetchWithTimeout(source.url, {}, fetchImpl);
      if (source.format === 'anthropic-newsroom') {
        if (!validateExpectedAnthropicNewsroom(xml)) throw new Error('Unexpected Anthropic newsroom response format; expected known article-card container.');
      } else if (source.format === 'feed' && !validateExpectedFeed(xml)) {
        throw new Error('Unexpected feed response format; expected RSS, Atom, or RDF root container.');
      }
      const items = source.format === 'anthropic-newsroom'
        ? parseAnthropicNewsroom(xml, source)
        : parseFeed(xml, source);
      console.log(`  -> Got ${items.length} items`);
      if (items.length === 0) {
        if (source.format === 'anthropic-newsroom' && containsAnthropicNewsCards(xml)) {
          throw new Error('Known newsroom cards were present but none produced a dated article.');
        }
        if (source.format === 'feed' && containsFeedEntries(xml)) {
          throw new Error('Feed entry nodes were present but none parsed as valid dated items.');
        }
        console.warn(`  [WARN] Valid ${source.format || 'feed'} container had no entries; classified as successful empty source.`);
      }

      for (const item of items) {
        if (!item.url || !item.title) continue;
        const urlLower = item.url.toLowerCase();
        const titleLower = item.title.toLowerCase().trim();

        // 既存チェック
        if (existingUrls.has(urlLower) || existingTitles.has(titleLower)) continue;

        // マーケティング・無関係な記事を除外
        if (EXCLUDE_REGEX.test(item.title) || EXCLUDE_REGEX.test(item.summary || '')) continue;
        if (isEventListing(`${item.title} ${item.summary || ''}`)) continue;

        const text = `${item.title} ${item.summary || ''} ${item.sourceCategory || ''}`;
        const hasKeyword = SECURITY_REGEX.test(text) || CLOUD_REGEX.test(text) || AI_REGEX.test(text);
        if (!hasKeyword) continue;

        // 重複候補防止
        if (candidateItems.some(c => c.url.toLowerCase() === urlLower || c.title.toLowerCase() === titleLower)) {
          continue;
        }

        // Missing or future publication dates are not trustworthy weekly candidates.
        const pubDate = item.publishedAt ? new Date(item.publishedAt) : null;
        if (!pubDate || Number.isNaN(pubDate.getTime()) || pubDate.getTime() > getNow().getTime()) continue;
        const year = pubDate.getFullYear();
        const kind = determineKind(item.title, item.summary, source.org);
        const level = determineLevel(kind, item.title, item.summary);
        const { focus, task } = generateFocusAndTask(item.title, item.summary, kind, source.org);
        const impactAssessment = assessImpact({ ...item, org: source.org }, source, getNow());
        const score = scoreRelevance(item, source) + impactAssessment.score;

        const id = `${slugify(source.org)}-${slugify(item.title)}`;

        candidateItems.push({
          id,
          org: source.org,
          title: item.title,
          kind,
          year,
          url: item.url,
          minutes: 20,
          level,
          focus,
          task,
          score,
          publishedAt: pubDate.toISOString(),
          impactAssessment,
          ...(item.sourceCategory ? { sourceCategory: item.sourceCategory } : {})
        });
      }
    } catch (err) {
      const cause = err.cause;
      const detail = [err.message, err.code, cause?.code, cause?.message].filter(Boolean).join(' | ');
      console.warn(`  [WARN] Failed to fetch or parse ${source.name}: ${detail}`);
      sourceFailures.push(source.name);
    }
  }

  // スコア順かつ公開日順に並べ替え（最もAI/クラウド/セキュリティとして価値の高い最新記事を上位に）
  // Add only curated conference material with a readable first-party abstract or paper.
  // Conference programs and event dates alone are not learning materials.
  candidateItems.push(...conferenceReadings.map(item => {
    const impactAssessment = assessImpact(item, { org: item.org }, getNow());
    return { ...item, impactAssessment, score: 70 + impactAssessment.score };
  }));

  candidateItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.publishedAt || b.eventEndDate || '').localeCompare(a.publishedAt || a.eventEndDate || '');
  });
  const communityCandidates = await enrichWithCommunitySignals(candidateItems, {
    fetchImpl,
    lookup: options.communityLookup,
    now: getNow,
    maxLookups: options.maxCommunityLookups ?? 12
  });
  candidateItems.splice(0, candidateItems.length, ...sortByPrimaryAndObservedCommunity(communityCandidates));
  const observedCommunityCount = candidateItems.reduce((count, item) =>
    count + (item.communitySignals?.some(signal => signal.status === 'observed') ? 1 : 0), 0);
  console.log(`[COMMUNITY] Hacker News exact-URL metrics observed for ${observedCommunityCount} candidate(s); other measurements remain unknown.`);

  console.log(`[INFO] Found ${candidateItems.length} candidate articles.`);
  const rotation = planRotation(currentReadings, candidateItems, {
    targetCount: options.targetCount ?? TARGET_COUNT,
    maxNewItems: options.maxNewItems ?? MAX_NEW_ITEMS,
    now: getNow(),
    maxPerEvidenceType: 3,
    maxPerPublisher: 4
  });
  const { added: selectedNew, removed, retained } = rotation;
  const finalList = rotation.finalList.map(({ score, ...item }) => item);
  console.log(`[INFO] Rotation: ${selectedNew.length} added, ${removed.length} removed, ${retained.length} retained.`);
  selectedNew.forEach(item => {
    const assessment = item.impactAssessment || {};
    const signalNames = (assessment.signals || []).map(signal => signal.type).join(',') || 'none';
    console.log(`[IMPACT] ${item.id}: score=${assessment.score ?? 0}; confidence=${assessment.confidence || 'unknown'}; signals=${signalNames}; assessed=${assessment.assessedAt || 'unknown'}; evidence=${assessment.evidenceUrl || item.url}; communityMetrics=${assessment.communityMetrics || 'not_collected_from_source'}`);
    for (const signal of item.communitySignals || []) {
      const metrics = signal.status === 'observed' ? `hnPoints=${signal.points}; hnComments=${signal.comments}` : `metrics=unknown; reason=${signal.reason}`;
      console.log(`[COMMUNITY] ${item.id}: status=${signal.status}; ${metrics}; observed=${signal.observedAt}; evidence=${signal.evidenceUrl || 'unknown'}`);
    }
  });
  selectedNew.forEach(item => {
    const sourceDate = item.publishedAt || `${item.eventStartDate}–${item.eventEndDate}`;
    console.log(`  + [${item.id}] [${item.org}] [${item.kind}] ${sourceDate} ${item.title} — ${item.url}`);
  });
  if (removed.length > 0) {
    console.log(`[INFO] Removed ${removed.length} oldest items (never more than the number added):`);
    removed.forEach(item => console.log(`  - [${item.id}] [${item.org}] (${item.year}) ${item.title}`));
  }
  console.log(`[INFO] Updated list length: ${finalList.length}`);
  if (rotation.shortfall > 0) {
    const reason = describeShortfall(rotation, sourceFailures.length, sourceList.length);
    console.warn(`[WARN] Replacement shortfall: ${rotation.shortfall} item(s); ${reason}. Old items were retained.`);
  }
  if (selectedNew.length === 0) {
    console.log('[INFO] No eligible items to add; keeping the current catalog unchanged.');
    const outputStatus = sourceFailures.length ? 'source-failures-no-candidates' : 'no-eligible-candidates';
    console.warn(`[WARN] Weekly update incomplete: 0 of ${options.maxNewItems ?? MAX_NEW_ITEMS} additions; ${sourceFailures.length} source failure(s).`);
    appendWorkflowOutput(options.githubOutputPath ?? process.env.GITHUB_OUTPUT, 'week_state', outputStatus);
    return;
  }
  const fileContent = `// AI・クラウド・セキュリティ 大手各社の最新レポート・論文・技術ブログ読書リスト
// GitHub Actions (update-content.yml) により週次で自動更新・ローテーションされます。
// URL はすべて公開ページ（arXiv / 各社公式サイト）。並び順がクエストで提案される優先順になる。
//   focus: 読むときの観点（何をつかめば「読めた」と言えるか）
//   task:  読んだあとに書くアウトプット
const AI_READINGS = ${JSON.stringify(finalList, null, 2)};

module.exports = { AI_READINGS };
`;

  if (isDryRun) {
    console.log('[INFO] Dry run finished. File not written.');
    appendWorkflowOutput(process.env.GITHUB_OUTPUT, 'week_state', 'dry-run');
  } else {
    writeFile(targetFile, fileContent, 'utf8');
    console.log(`[SUCCESS] Successfully written updated readings to ${targetFile}`);
    const complete = isWeeklyUpdateComplete(selectedNew.length, sourceFailures.length, MAX_NEW_ITEMS);
    recordWeekUpdate(weekStateFile, {
      weekKey,
      status: complete ? 'complete' : 'partial',
      updatedAt: getNow(),
      additions: selectedNew.length,
      removals: removed.length,
      sourceFailures
    });
    if (complete) {
      console.log(`[SUCCESS] Marked JST week ${weekKey} complete after ${selectedNew.length} additions and zero source failures.`);
      appendWorkflowOutput(options.githubOutputPath ?? process.env.GITHUB_OUTPUT, 'week_state', 'complete');
    } else {
      const reason = `${selectedNew.length} of ${MAX_NEW_ITEMS} additions and ${sourceFailures.length} source failure(s)`;
      console.warn(`[WARN] Recorded a partial catalog update for JST week ${weekKey} (${reason}); duplicate runs will not replace more items.`);
      appendWorkflowOutput(options.githubOutputPath ?? process.env.GITHUB_OUTPUT, 'week_state', 'partial-updated');
    }
  }
}

function readCurrentWeekState(weekKey, stateFile = WEEK_STATE_FILE) {
  const state = readWeeklyState(stateFile);
  return state && state.updatedWeek === weekKey ? state : null;
}

if (require.main === module) {
  main().catch(err => {
    console.error('[ERROR]', err);
    process.exit(1);
  });
}

module.exports = { main, SOURCES, TARGET_FILE, WEEK_STATE_FILE };
