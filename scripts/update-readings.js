// scripts/update-readings.js
// AI・クラウド・セキュリティに関する最新情報（公式ブログ・論文・脅威レポート）を取得し、
// 学習教材（lib/content/ai-readings.js）を週次で更新・ローテーションするスクリプト。

const fs = require('fs');
const path = require('path');
const { parseFeed } = require('../lib/feeds');
const { AI_READINGS: existingReadings } = require('../lib/content/ai-readings');

const TARGET_FILE = path.join(__dirname, '..', 'lib', 'content', 'ai-readings.js');
const TARGET_COUNT = 36; // 常に最新36件を維持
const MAX_NEW_ITEMS = 4; // 1回の更新で取り込む最大新規件数
const FETCH_TIMEOUT_MS = 10000;

// AI・クラウド・セキュリティの公式情報源
const SOURCES = [
  { id: 'ms-sec', name: 'Microsoft Security', org: 'Microsoft', url: 'https://www.microsoft.com/en-us/security/blog/feed/' },
  { id: 'aws-sec', name: 'AWS Security', org: 'AWS', url: 'https://aws.amazon.com/blogs/security/feed/' },
  { id: 'gcp', name: 'Google Cloud', org: 'Google Cloud', url: 'https://cloudblog.withgoogle.com/rss/' },
  { id: 'deepmind', name: 'Google DeepMind', org: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
  { id: 'google-ai', name: 'Google AI', org: 'Google', url: 'https://blog.google/technology/ai/rss/' },
  { id: 'openai', name: 'OpenAI', org: 'OpenAI', url: 'https://openai.com/news/rss.xml' },
  {
    id: 'arxiv-llm-sec',
    name: 'arXiv (LLM Security)',
    org: 'arXiv',
    url: 'https://export.arxiv.org/api/query?search_query=cat:cs.CR+AND+abs:%22language+model%22&sortBy=submittedDate&sortOrder=descending&max_results=10'
  },
  {
    id: 'arxiv-cloud-sec',
    name: 'arXiv (Cloud Security)',
    org: 'arXiv',
    url: 'https://export.arxiv.org/api/query?search_query=cat:cs.CR+AND+(abs:%22cloud%22+OR+abs:%22kubernetes%22)+AND+abs:%22security%22&sortBy=submittedDate&sortOrder=descending&max_results=10'
  }
];

// 教材として不適切なマーケティング・宣伝記事を除外
const EXCLUDE_REGEX = /(?:sales|customer story|customer stories|webinar|quarterly|earnings|pricing|hiring|careers|sponsored|podcast|discount)/i;

// AI・クラウド・セキュリティに関連するキーワード
const SECURITY_REGEX = /(?:security|vulnerab|threat|attack|malware|defense|privacy|red[\s-]team|cve|zero[\s-]day|ransomware|guardrail|safety|auth|breach|jailbreak|prompt[\s-]injection|poisoning|backdoor|exploit|storm-)/i;
const CLOUD_REGEX = /(?:cloud|aws|azure|gcp|kubernetes|iam|container|serverless|s3|vpc|identity|service[\s-]principal)/i;
const AI_REGEX = /(?:ai|llm|agent|model|gpt|claude|gemini|deep[\s-]learning|reasoning|foundation|transformer)/i;

async function fetchWithTimeout(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
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

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`[INFO] Starting AI/Cloud/Security readings update (DryRun: ${isDryRun})...`);

  const existingUrls = new Set(existingReadings.map(r => r.url.toLowerCase()));
  const existingTitles = new Set(existingReadings.map(r => r.title.toLowerCase().trim()));
  const existingIds = new Set(existingReadings.map(r => r.id));

  const candidateItems = [];

  for (const source of SOURCES) {
    try {
      console.log(`[FETCH] Fetching from ${source.name}...`);
      const xml = await fetchWithTimeout(source.url);
      const items = parseFeed(xml, source);
      console.log(`  -> Got ${items.length} items`);

      for (const item of items) {
        if (!item.url || !item.title) continue;
        const urlLower = item.url.toLowerCase();
        const titleLower = item.title.toLowerCase().trim();

        // 既存チェック
        if (existingUrls.has(urlLower) || existingTitles.has(titleLower)) continue;

        // マーケティング・無関係な記事を除外
        if (EXCLUDE_REGEX.test(item.title) || EXCLUDE_REGEX.test(item.summary || '')) continue;

        const text = `${item.title} ${item.summary || ''}`;
        const hasKeyword = SECURITY_REGEX.test(text) || CLOUD_REGEX.test(text) || AI_REGEX.test(text);
        if (!hasKeyword) continue;

        // 重複候補防止
        if (candidateItems.some(c => c.url.toLowerCase() === urlLower || c.title.toLowerCase() === titleLower)) {
          continue;
        }

        const pubDate = item.publishedAt ? new Date(item.publishedAt) : new Date();
        const year = Number.isNaN(pubDate.getTime()) ? new Date().getFullYear() : pubDate.getFullYear();
        const kind = determineKind(item.title, item.summary, source.org);
        const level = determineLevel(kind, item.title, item.summary);
        const { focus, task } = generateFocusAndTask(item.title, item.summary, kind, source.org);
        const score = scoreRelevance(item, source);

        let id = `${slugify(source.org)}-${slugify(item.title)}`;
        if (existingIds.has(id)) {
          id = `${id}-${Math.floor(Math.random() * 1000)}`;
        }

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
          publishedAt: item.publishedAt || new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn(`  [WARN] Failed to fetch ${source.name}: ${err.message}`);
    }
  }

  // スコア順かつ公開日順に並べ替え（最もAI/クラウド/セキュリティとして価値の高い最新記事を上位に）
  candidateItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.publishedAt.localeCompare(a.publishedAt);
  });

  console.log(`[INFO] Found ${candidateItems.length} candidate articles.`);
  const selectedNew = candidateItems.slice(0, MAX_NEW_ITEMS);

  if (selectedNew.length === 0) {
    console.log('[INFO] No new items to add today. Keeping current list.');
    return;
  }

  console.log(`[INFO] Selected ${selectedNew.length} new items to add:`);
  selectedNew.forEach(item => {
    console.log(`  + [${item.org}] (score: ${item.score}, ${item.year}) ${item.title}`);
  });

  // 新規アイテムから作業用プロパティを除去
  const cleanNewItems = selectedNew.map(({ publishedAt, score, ...rest }) => rest);

  // 古い内容を順次削除するロジック：
  // 既存リストのうち、発行年（year）が最も古いものを優先的に削除対象とする。
  // 同じ年であれば、リストの末尾側にあるものを優先して削除。
  let workingList = [...existingReadings];
  const itemsToRemoveCount = (workingList.length + cleanNewItems.length) - TARGET_COUNT;
  const removed = [];

  if (itemsToRemoveCount > 0) {
    // 削除候補を特定するため、(year 昇順, 元のインデックス 降順) でソートした順序でインデックスを決定
    const indexed = workingList.map((item, originalIndex) => ({ item, originalIndex }));
    indexed.sort((a, b) => {
      if (a.item.year !== b.item.year) {
        return a.item.year - b.item.year; // 年が古いものが先（削除優先）
      }
      return b.originalIndex - a.originalIndex; // 同じ年なら末尾に近いものが先
    });

    const removeOriginalIndices = new Set(indexed.slice(0, itemsToRemoveCount).map(x => x.originalIndex));
    
    const keptList = [];
    workingList.forEach((item, idx) => {
      if (removeOriginalIndices.has(idx)) {
        removed.push(item);
      } else {
        keptList.push(item);
      }
    });
    workingList = keptList;
  }

  // 最新の新着アイテムを先頭に追加
  const finalList = [...cleanNewItems, ...workingList];

  if (removed.length > 0) {
    console.log(`[INFO] Pruned ${removed.length} oldest items to keep total at ${TARGET_COUNT}:`);
    removed.forEach(item => console.log(`  - [${item.org}] (${item.year}) ${item.title}`));
  }

  console.log(`[INFO] Updated list length: ${finalList.length}`);

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
  } else {
    fs.writeFileSync(TARGET_FILE, fileContent, 'utf8');
    console.log(`[SUCCESS] Successfully written updated readings to ${TARGET_FILE}`);
  }
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
