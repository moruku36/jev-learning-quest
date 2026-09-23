const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const APP_NAME = 'Jev 学習クエスト';
const APP_VERSION = '1.2.0';
const PORT = process.env.PORT || 3000;
// 既定ではこのPCからのみアクセス可能（APIキーを扱うため）
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = process.env.LQ_DATA_DIR ? path.resolve(process.env.LQ_DATA_DIR) : path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const JEV_ENDPOINT = process.env.JEV_API_URL || 'https://api.typesafe.ai/v1/systemone';
const JEV_TIMEOUT_MS = 8000;

// --- サンプルデータ定義（架空と明記） ---
const INITIAL_DATA = {
  items: [
    {
      id: 'sample_sc_01',
      type: 'sc_past_paper',
      category: 'sc',
      title: '【サンプル】令和5年秋期 支援士 科目B 問1 (Webセキュリティ)',
      source: 'IPA 過去問題 (架空演習用サンプル)',
      url: '',
      publishedDate: '2023-10-08',
      questionText: '設問1: 被害を受けたECサイトのセッション管理において、Cookie窃取を防ぐために設定すべきCookie属性とその理由を40字以内で述べよ。',
      userAnswer: 'HttpOnly属性を設定し、JavaScriptからのCookie読み取りを制限する。',
      notes: 'XSSによるセッションハイジャック対策。Secure属性との使い分けに注意。',
      practicalValue: 'high',
      needsReview: true,
      nextAction: '既存知識と比較する',
      isSample: true,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 'sample_sc_02',
      type: 'sc_past_paper',
      category: 'sc',
      title: '【サンプル】令和4年秋期 支援士 科目B 問2 (認証・認可)',
      source: 'IPA 過去問題 (架空演習用サンプル)',
      url: '',
      publishedDate: '2022-10-09',
      questionText: '設問2: OAuth 2.0 PKCEにおいて、認可コード横取り攻撃を防ぐためにクライアントが送信するパラメータを2つ挙げよ。',
      userAnswer: 'code_challenge と code_verifier。',
      notes: '認可リクエスト時にcode_challenge、トークンリクエスト時にcode_verifierを送る。',
      practicalValue: 'high',
      needsReview: false,
      nextAction: '設定を確認する',
      isSample: true,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'sample_ai_01',
      type: 'catchup',
      category: 'ai',
      title: '【サンプル】LLMアプリケーション向けガードレール設計ガイド',
      source: '技術ブログ記事 (架空サンプル)',
      url: 'https://example.com/ai/guardrails-guide',
      publishedDate: '2026-09-15',
      questionText: '',
      userAnswer: '',
      notes: '入力フィルタリングと出力検証の多層防御。プロンプトインジェクション検知ルールを整理。',
      practicalValue: 'high',
      needsReview: true,
      nextAction: '試す',
      isSample: true,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'sample_cloud_01',
      type: 'catchup',
      category: 'cloud',
      title: '【サンプル】クラウドIAM最小権限運用の自動化ポリシー改定',
      source: 'クラウド公式アップデート (架空サンプル)',
      url: 'https://example.com/cloud/iam-least-privilege',
      publishedDate: '2026-09-18',
      questionText: '',
      userAnswer: '',
      notes: '未使用権限の90日経過自動無効化とアラート通知のベストプラクティス。',
      practicalValue: 'medium',
      needsReview: false,
      nextAction: '設定を確認する',
      isSample: true,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: 'sample_sec_01',
      type: 'catchup',
      category: 'security',
      title: '【サンプル】Active Directory環境におけるKerberoasting攻撃事例と検知',
      source: 'CERT セキュリティ速報 (架空サンプル)',
      url: 'https://example.com/sec/kerberoasting-alert',
      publishedDate: '2026-09-20',
      questionText: '',
      userAnswer: '',
      notes: 'SPNが設定されたサービスアカウントの暗号化方式をAES-256に制限し、イベントID 4769を監視。',
      practicalValue: 'high',
      needsReview: true,
      nextAction: 'チーム向けに説明する',
      isSample: true,
      createdAt: new Date().toISOString()
    }
  ],
  history: [
    {
      id: 'sample_hist_01',
      itemId: 'sample_sc_01',
      category: 'sc',
      questType: '過去問を解く',
      title: '【サンプル】令和5年秋期 支援士 科目B 問1 初回演習',
      minutes: 25,
      reason: '科目Bの記述答案作成の訓練のため',
      criteria: 'Cookie属性名と理由を文字数内で正確に記述する',
      decisionSource: 'rule',
      userAnswer: 'HttpOnly属性を設定し、JavaScriptからのアクセスを遮断する。',
      isCorrect: false,
      mistakeReason: '設問要求とのずれ', // 読み落とし / 知識不足 / 設問要求とのずれ / 時間不足 / その他
      mistakeDetail: '「理由」部分でXSSへの言及が不足していた',
      reviewIntervalDays: 3,
      nextReviewDate: new Date(Date.now() - 3600000).toISOString(), // 復習期限到来
      understandingScore: 2,
      noulNeedsReview: true,
      isSample: true,
      completedAt: new Date(Date.now() - 3 * 86400000).toISOString()
    }
  ]
};

// --- ストレージ操作（アトミック書き込み） ---
function loadStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf8');
      return JSON.parse(JSON.stringify(INITIAL_DATA));
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load store, initializing fallback:', err.message);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }
}

function saveStore(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('Failed to save store:', err.message);
    return false;
  }
}

// --- Jev APIキー管理 ---
// 優先順位: 環境変数 JEV_API_KEY > 画面から保存したキー (data/config.json)
// キーはサーバー側にのみ保持し、ブラウザにはマスク済みの値しか返さない。
function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) || {};
  } catch (err) {
    console.error('Failed to load config:', err.message);
    return {};
  }
}

function saveConfig(config) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${CONFIG_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmpFile, CONFIG_FILE);
}

function getJevKeyInfo() {
  const envKey = (process.env.JEV_API_KEY || '').trim();
  if (envKey) return { key: envKey, source: 'env' };
  const savedKey = (loadConfig().jevApiKey || '').trim();
  if (savedKey) return { key: savedKey, source: 'saved' };
  return { key: '', source: 'none' };
}

function maskKey(key) {
  if (!key) return '';
  return key.length <= 8 ? '••••' : `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

// --- Jev API クライアント (文章生成を行わず判断のみ利用) ---
async function callJevSystemOne({ state, questions, apiKey }) {
  const key = (apiKey || getJevKeyInfo().key).trim();
  if (!key) {
    return { success: false, reason: 'KEY_NOT_CONFIGURED' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JEV_TIMEOUT_MS);

  try {
    const res = await fetch(JEV_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'jev-latest',
        state,
        questions
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { success: false, reason: `HTTP_${res.status}`, httpStatus: res.status, detail: errText.slice(0, 150) };
    }

    const data = await res.json();
    if (!data || !data.answers) {
      return { success: false, reason: 'INVALID_RESPONSE' };
    }

    return { success: true, answers: data.answers };
  } catch (err) {
    clearTimeout(timeoutId);
    return { success: false, reason: err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR', detail: err.message };
  }
}

// --- クエスト候補生成 & ルールベース判定エンジン ---
function generateQuestCandidates({ store, category, minutes, goal }) {
  const candidates = [];
  const now = new Date();

  // 1. 再挑戦待ち (誤答かつ復習期限到来または弱点)
  const pendingReviews = store.history.filter(h => {
    if (h.isCorrect || h.resolved) return false;
    if (category !== 'all' && h.category !== category) return false;
    if (!h.nextReviewDate) return true;
    return new Date(h.nextReviewDate) <= now;
  });

  pendingReviews.forEach(h => {
    const item = store.items.find(i => i.id === h.itemId);
    candidates.push({
      id: `review_${h.id}`,
      type: '誤答を直す',
      category: h.category,
      title: `【再挑戦】${h.title || (item ? item.title : '過去問演習')}の弱点克服`,
      sourceRef: item ? item.source : '前回答案記録',
      questionText: item ? item.questionText : '',
      previousMistake: `${h.mistakeReason || '誤答'}: ${h.mistakeDetail || ''}`,
      recommendedMinutes: Math.min(minutes, 20),
      reason: `前回の誤答原因「${h.mistakeReason || '知識不足'}」を克服するため、解説を見ずに再挑戦します。`,
      criteria: '前回の誤答箇所を修正し、設問要求を満たす正確な記述または解答ができること。',
      itemId: h.itemId,
      historyId: h.id
    });
  });

  // 2. 登録済み過去問 (未着手または演習)
  const pastPapers = store.items.filter(i => {
    if (i.type !== 'sc_past_paper') return false;
    if (category !== 'all' && i.category !== category) return false;
    return true;
  });

  pastPapers.forEach(item => {
    candidates.push({
      id: `past_${item.id}`,
      type: '過去問を解く',
      category: item.category,
      title: `過去問記述演習: ${item.title}`,
      sourceRef: item.source,
      questionText: item.questionText,
      recommendedMinutes: Math.max(20, Math.min(minutes, 30)),
      reason: '支援士科目Bの記述力と設問読解力を高めるため、解説を見ずに時間を計って答案を作成します。',
      criteria: '制限時間内に自分の答案を完成させ、設問要求との合致度を自己評価できること。',
      itemId: item.id
    });
  });

  // 3. キャッチアップ情報 (次の行動付き)
  const catchups = store.items.filter(i => {
    if (i.type === 'sc_past_paper') return false;
    if (category !== 'all' && i.category !== category) return false;
    return true;
  });

  catchups.forEach(item => {
    const action = item.nextAction || '実務への影響を整理する';
    candidates.push({
      id: `catchup_${item.id}`,
      type: action === '試す' ? '更新を読む' : (action === 'チーム向けに説明する' ? '短く説明する' : '実務への影響を整理する'),
      category: item.category,
      title: `技術キャッチアップ: ${item.title}`,
      sourceRef: item.source || item.url,
      nextAction: action,
      notes: item.notes,
      recommendedMinutes: Math.min(minutes, 15),
      reason: `登録した技術情報「${item.title}」をインプットし、次の行動【${action}】を具体化します。`,
      criteria: `「${action}」を実行し、得られた要点や留意事項をメモとして1点以上残すこと。`,
      itemId: item.id
    });
  });

  // 候補が空の場合の汎用テンプレート候補
  if (candidates.length === 0) {
    const targetCat = category === 'all' ? 'sc' : category;
    candidates.push({
      id: 'default_past_01',
      type: '過去問を解く',
      category: targetCat,
      title: '情報処理安全確保支援士 科目B 設問分析と答案作成',
      sourceRef: 'IPA公式サイトの最新過去問',
      recommendedMinutes: minutes,
      reason: '集中して1問の答案作成を行い、キーワードと設問の要求事項の整合性を鍛えるため。',
      criteria: '解説を見ずに答案を書き上げ、所要時間と誤答原因を記録すること。'
    });
    candidates.push({
      id: 'default_catchup_01',
      type: '実務への影響を整理する',
      category: targetCat === 'sc' ? 'security' : targetCat,
      title: '最新の脆弱性・技術動向の要点整理と次アクション策定',
      sourceRef: '公式リリース・信頼できる技術ブログ',
      recommendedMinutes: Math.min(minutes, 20),
      reason: '短時間で技術動向の要点を捉え、実務への適用可否と次のアクションを1点定義するため。',
      criteria: '概要・実務での活用価値・次の具体的な行動（試す/説明等）を登録すること。'
    });
  }

  return candidates;
}

// ルールベースによる最適なクエスト選択
function selectQuestByRule(candidates, { minutes, goal, category }) {
  const findExercise = () => candidates.find(c => c.type === '過去問を解く');
  const findInput = () => candidates.find(c => c.type === '短く説明する' || c.type === '更新を読む' || c.type === '実務への影響を整理する');

  // 1. 気分で明示された目的を優先する
  if (goal === 'exercise' && findExercise()) {
    return { selected: findExercise(), reasonDetail: '「じっくり演習」が選ばれたため、過去問の答案作成を提案しました。' };
  }
  if (goal === 'input' && findInput()) {
    return { selected: findInput(), reasonDetail: '「サクッと情報収集」が選ばれたため、技術キャッチアップを提案しました。' };
  }

  // 2. 再挑戦待ちがあれば最優先（おまかせ / 弱点をつぶす）
  const reviewCand = candidates.find(c => c.type === '誤答を直す');
  if (reviewCand) {
    return { selected: reviewCand, reasonDetail: '復習期限が来た誤答があるため、最優先で提案しました。' };
  }

  // 3. 時間が十分にある（30分以上）なら演習
  if (minutes >= 30 && findExercise()) {
    return { selected: findExercise(), reasonDetail: `使える時間（${minutes}分）を活かして答案作成を進めるため提案しました。` };
  }

  // 4. 短時間（10〜20分）ならキャッチアップ
  if (minutes <= 20 && findInput()) {
    return { selected: findInput(), reasonDetail: `短時間（${minutes}分）で終わるキャッチアップとして提案しました。` };
  }

  return { selected: candidates[0], reasonDetail: '現在の学習状況と条件に最も合うクエストを提案しました。' };
}

// Jevによるクエスト推薦 (Choice primitive を利用)
async function recommendQuestWithJev({ store, category, minutes, goal }) {
  const candidates = generateQuestCandidates({ store, category, minutes, goal });
  const apiKeyConfigured = Boolean(getJevKeyInfo().key);

  if (!apiKeyConfigured) {
    const ruleResult = selectQuestByRule(candidates, { minutes, goal, category });
    return {
      quest: ruleResult.selected,
      allCandidates: candidates,
      decisionSource: 'rule',
      decisionNote: ruleResult.reasonDetail,
      jevStatus: 'UNCONFIGURED'
    };
  }

  // Jev Choice用のcriteriaマップを生成 (id -> 説明)
  const choiceCriteria = {};
  candidates.slice(0, 8).forEach(c => {
    choiceCriteria[c.id] = `[${c.type}][${c.category}] ${c.title} (所要:${c.recommendedMinutes}分) - 狙い: ${c.reason}`;
  });

  const goalLabel = {
    balance: 'おまかせ（弱点があれば克服を優先）',
    weakness: '弱点をつぶしたい（誤答の再挑戦を最優先）',
    exercise: 'じっくり演習したい（過去問の答案作成を優先）',
    input: 'サクッと情報収集したい（技術キャッチアップを優先）'
  }[goal] || 'おまかせ';

  const statePrompt = `ユーザーの学習状態:
- 選択分野: ${category}
- 利用可能時間: ${minutes}分
- 今日の気分・目的: ${goalLabel}
- 登録学習項目数: ${store.items.length}件
- 過去の演習履歴数: ${store.history.length}件
- 未克服の誤答数: ${store.history.filter(h => !h.isCorrect && !h.resolved).length}件`;

  const jevRes = await callJevSystemOne({
    state: statePrompt,
    questions: {
      next_quest: {
        type: 'choice',
        instructions: `利用可能時間（${minutes}分）と「今日の気分・目的」に最も適した学習クエストを1つ選んでください。気分・目的が明示されている場合はそれを最優先し、おまかせの場合は復習すべき弱点の克服を優先してください。`,
        criteria: choiceCriteria
      }
    }
  });

  const chosenId = jevRes.success ? jevRes.answers?.next_quest?.choice : undefined;
  const selected = chosenId !== undefined ? candidates.find(c => c.id === chosenId) : undefined;
  if (selected) {
    const confidence = jevRes.answers.next_quest.confidence || 0;

    return {
      quest: selected,
      allCandidates: candidates,
      decisionSource: 'jev',
      decisionNote: 'Jev (Choice) が、現在の学習状態と使える時間から最適なクエストを選びました。',
      jevConfidenceScore: confidence, // 内部評価・デバッグ用（正解率としては表示しない）
      jevStatus: 'SUCCESS'
    };
  }

  // Jev失敗時の完全フォールバック
  const fallbackResult = selectQuestByRule(candidates, { minutes, goal, category });
  return {
    quest: fallbackResult.selected,
    allCandidates: candidates,
    decisionSource: 'rule_fallback',
    decisionNote: `Jev に接続できなかったため、アプリ内ルールで提案しました。(${jevRes.reason || 'UNKNOWN_CHOICE'})`,
    jevStatus: 'FAILED',
    jevError: jevRes.reason || 'UNKNOWN_CHOICE'
  };
}

// Jevによる評価判定 (Score & Noul primitives を利用)
async function evaluateResultWithJev({ resultData }) {
  const apiKeyConfigured = Boolean(getJevKeyInfo().key);

  if (!apiKeyConfigured) {
    // ルールベース判定
    const isCorrect = resultData.isCorrect === true || resultData.isCorrect === 'true';
    const score = isCorrect ? 3 : (resultData.mistakeReason === '読み落とし' ? 2 : 1);
    const needsReview = !isCorrect;
    return {
      understandingScore: score,
      needsReview,
      decisionSource: 'rule'
    };
  }

  const statePrompt = `学習クエスト完了結果:
- クエスト名: ${resultData.title || ''}
- 分野: ${resultData.category || ''}
- 正誤判定: ${resultData.isCorrect ? '正解' : '誤答'}
- 誤答原因: ${resultData.mistakeReason || 'なし'}
- 誤答詳細・気付きメモ: ${resultData.mistakeDetail || resultData.notes || '特になし'}
- ユーザー自己答案: ${resultData.userAnswer || ''}`;

  const jevRes = await callJevSystemOne({
    state: statePrompt,
    questions: {
      understanding_score: {
        type: 'score',
        instructions: '学習者の解答および自己分析メモから、このテーマの理解度を4段階（1:基礎知識不足, 2:要復習, 3:概ね理解, 4:完璧に理解）で判定してください。',
        criteria: ['基礎知識不足', '要復習', '概ね理解', '完璧に理解']
      },
      needs_review: {
        type: 'noul',
        instructions: '数日後にこの問題を解説なしで再挑戦・復習する必要があるかどうかを判定してください。'
      }
    }
  });

  if (jevRes.success && jevRes.answers) {
    const scoreAns = jevRes.answers.understanding_score;
    const noulAns = jevRes.answers.needs_review;
    // score は 0〜3 の連続値（criteria の添字）→ 画面表示用の 1〜4 に変換
    const understandingScore = typeof scoreAns?.score === 'number'
      ? Math.min(4, Math.max(1, Math.round(scoreAns.score) + 1))
      : 2;
    // noul は「はい」の確率 (0〜1)。0.5 以上で復習が必要と判断する
    const noul = noulAns?.noul;
    const needsReview = typeof noul === 'number' ? noul >= 0.5
      : typeof noul === 'boolean' ? noul
      : !resultData.isCorrect;
    return {
      understandingScore,
      needsReview,
      decisionSource: 'jev'
    };
  }

  // フォールバック
  const isCorrect = resultData.isCorrect === true || resultData.isCorrect === 'true';
  return {
    understandingScore: isCorrect ? 3 : 2,
    needsReview: !isCorrect,
    decisionSource: 'rule_fallback'
  };
}

// --- HTTPリクエスト処理 ---
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function jevStatusPayload() {
  const info = getJevKeyInfo();
  return {
    jevConfigured: Boolean(info.key),
    keySource: info.source, // 'env' | 'saved' | 'none'
    maskedKey: maskKey(info.key)
  };
}

function describeJevError(result) {
  if (result.reason === 'TIMEOUT') return `タイムアウトしました（${JEV_TIMEOUT_MS / 1000}秒）。ネットワーク環境を確認してください。`;
  if (result.reason === 'NETWORK_ERROR') return `Jev に接続できませんでした: ${result.detail || ''}`;
  if (result.httpStatus === 401 || result.httpStatus === 403) return 'APIキーが無効です。キーをもう一度確認してください。';
  if (result.httpStatus) return `Jev API エラー (HTTP ${result.httpStatus}) ${result.detail || ''}`;
  return 'Jev から想定外の応答がありました。';
}

async function testJevKey(apiKey) {
  const startTime = Date.now();
  const result = await callJevSystemOne({
    apiKey,
    state: 'ユーザーが Jev 学習クエストの接続テストを実行中。',
    questions: {
      ping_check: { type: 'noul', instructions: '接続は正常ですか？' }
    }
  });
  const elapsedMs = Date.now() - startTime;
  if (result.success) {
    return { success: true, elapsedMs, message: `Jev に接続できました（応答 ${elapsedMs}ms）` };
  }
  const errorType = (result.httpStatus === 401 || result.httpStatus === 403) ? 'auth'
    : (result.reason === 'TIMEOUT' || result.reason === 'NETWORK_ERROR') ? 'network' : 'other';
  return { success: false, elapsedMs, errorType, error: describeJevError(result) };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // 書き込み系APIは JSON のみ受け付ける。
  // CORSヘッダーを返さないため、他サイトからのJSON送信（APIキー書き換え・データ上書き）はブラウザが遮断する。
  if (req.method === 'POST' && !(req.headers['content-type'] || '').includes('application/json')) {
    sendJson(res, 415, { error: 'Content-Type は application/json を指定してください' });
    return;
  }

  try {
    // 1. アプリ / Jev接続状態確認 (キーそのものは返さない)
    if (req.method === 'GET' && pathname === '/api/status') {
      sendJson(res, 200, {
        appName: APP_NAME,
        version: APP_VERSION,
        ...jevStatusPayload()
      });
      return;
    }

    // 1-b. Jev APIキーの保存 / 削除
    if (req.method === 'POST' && pathname === '/api/settings/jev-key') {
      const body = await parseJsonBody(req);
      if (process.env.JEV_API_KEY && process.env.JEV_API_KEY.trim()) {
        sendJson(res, 409, {
          success: false,
          error: '環境変数 JEV_API_KEY が設定されているため、画面からは変更できません。',
          ...jevStatusPayload()
        });
        return;
      }
      const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
      const config = loadConfig();
      if (apiKey) {
        config.jevApiKey = apiKey;
      } else {
        delete config.jevApiKey;
      }
      saveConfig(config);
      sendJson(res, 200, {
        success: true,
        message: apiKey ? 'Jev APIキーを保存しました' : 'Jev APIキーを削除しました（ルールで動作します）',
        ...jevStatusPayload()
      });
      return;
    }

    // 1-c. Jev API 接続テスト (入力中のキー、なければ保存済みのキー)
    if (req.method === 'POST' && pathname === '/api/settings/test-jev') {
      const body = await parseJsonBody(req);
      const testKey = (typeof body.apiKey === 'string' && body.apiKey.trim()) || getJevKeyInfo().key;
      if (!testKey) {
        sendJson(res, 400, { success: false, error: 'APIキーを入力してください。' });
        return;
      }
      sendJson(res, 200, await testJevKey(testKey));
      return;
    }

    // 2. 今日のクエスト推薦 (Jev Choice or ルールベース)
    if (req.method === 'POST' && pathname === '/api/quest/recommend') {
      const body = await parseJsonBody(req);
      const store = loadStore();
      const minutes = parseInt(body.minutes, 10) || 20;
      const category = body.category || 'all';
      const goal = body.goal || 'balance';

      const result = await recommendQuestWithJev({ store, category, minutes, goal });
      sendJson(res, 200, result);
      return;
    }

    // 3. クエスト結果の保存
    if (req.method === 'POST' && pathname === '/api/history') {
      const body = await parseJsonBody(req);
      const store = loadStore();
      const isCorrect = body.isCorrect === true || body.isCorrect === 'true';

      // Jev Score / Noul または ルールベースで判定
      const evalRes = await evaluateResultWithJev({ resultData: body });

      const newHistory = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        itemId: body.itemId || null,
        retryOf: body.retryOf || null,
        category: body.category || 'sc',
        questType: body.questType || '演習',
        title: body.title || '完了クエスト',
        minutes: parseInt(body.minutes, 10) || 15,
        reason: body.reason || '',
        criteria: body.criteria || '',
        decisionSource: body.decisionSource || evalRes.decisionSource,
        userAnswer: body.userAnswer || '',
        isCorrect,
        mistakeReason: body.mistakeReason || '', // 読み落とし / 知識不足 / 設問要求とのずれ / 時間不足 / その他
        mistakeDetail: body.mistakeDetail || '',
        notes: body.notes || '',
        understandingScore: evalRes.understandingScore,
        noulNeedsReview: evalRes.needsReview,
        reviewIntervalDays: evalRes.needsReview ? (isCorrect ? 7 : 3) : 14,
        nextReviewDate: evalRes.needsReview
          ? new Date(Date.now() + (isCorrect ? 7 : 3) * 86400000).toISOString()
          : null,
        isSample: false,
        completedAt: new Date().toISOString()
      };

      // 再挑戦で正解できたら、元の誤答を「克服済み」にして復習リストから外す
      let resolvedHistoryId = null;
      if (newHistory.retryOf) {
        const original = store.history.find(h => h.id === newHistory.retryOf);
        if (original) {
          if (isCorrect) {
            original.resolved = true;
            original.resolvedAt = newHistory.completedAt;
            resolvedHistoryId = original.id;
          } else {
            // 再び誤答した場合は数日後にもう一度出題する
            original.nextReviewDate = new Date(Date.now() + 3 * 86400000).toISOString();
          }
        }
      }

      store.history.unshift(newHistory);
      saveStore(store);

      // 演習後に初めて解答ポイントを見せる
      const item = store.items.find(i => i.id === newHistory.itemId);

      sendJson(res, 201, {
        success: true,
        history: newHistory,
        evaluation: evalRes,
        resolvedHistoryId,
        answerNotes: item ? item.notes || '' : ''
      });
      return;
    }

    // 4. 学習履歴一覧の取得
    if (req.method === 'GET' && pathname === '/api/history') {
      const store = loadStore();
      sendJson(res, 200, { history: store.history });
      return;
    }

    // 5. 登録アイテム（過去問・キャッチアップ）の一覧取得
    if (req.method === 'GET' && pathname === '/api/registered-items') {
      const store = loadStore();
      sendJson(res, 200, { items: store.items });
      return;
    }

    // 6. 新規アイテムの登録（過去問 または 技術情報キャッチアップ）
    if (req.method === 'POST' && pathname === '/api/registered-items') {
      const body = await parseJsonBody(req);
      if (!body.title || !body.category) {
        sendJson(res, 400, { error: 'タイトルと分野は必須です' });
        return;
      }

      const store = loadStore();
      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: body.type || 'catchup', // 'sc_past_paper' or 'catchup'
        category: body.category, // 'sc', 'ai', 'cloud', 'security'
        title: body.title.trim(),
        source: body.source ? body.source.trim() : '',
        url: body.url ? body.url.trim() : '',
        publishedDate: body.publishedDate || '',
        questionText: body.questionText ? body.questionText.trim() : '',
        userAnswer: body.userAnswer ? body.userAnswer.trim() : '',
        notes: body.notes ? body.notes.trim() : '',
        practicalValue: body.practicalValue || 'medium', // high, medium, low
        needsReview: body.needsReview === true || body.needsReview === 'true',
        nextAction: body.nextAction || '既存知識と比較する', // 試す, 設定を確認する, 既存知識と比較する, チーム向けに説明する
        isSample: false,
        createdAt: new Date().toISOString()
      };

      store.items.unshift(newItem);
      saveStore(store);

      sendJson(res, 201, { success: true, item: newItem });
      return;
    }

    // 7. サンプルデータの初期投入 / リセット
    if (req.method === 'POST' && pathname === '/api/seed') {
      const store = loadStore();
      const body = await parseJsonBody(req);
      if (body.action === 'reset_all') {
        saveStore(INITIAL_DATA);
        sendJson(res, 200, { success: true, message: '全データを初期サンプル状態にリセットしました' });
        return;
      } else if (body.action === 'add_samples') {
        const existingIds = new Set(store.items.map(i => i.id));
        INITIAL_DATA.items.forEach(item => {
          if (!existingIds.has(item.id)) {
            store.items.push(item);
          }
        });
        const existingHistIds = new Set(store.history.map(h => h.id));
        INITIAL_DATA.history.forEach(h => {
          if (!existingHistIds.has(h.id)) {
            store.history.push(h);
          }
        });
        saveStore(store);
        sendJson(res, 200, { success: true, message: 'サンプルデータを追加しました' });
        return;
      } else if (body.action === 'clear_samples') {
        store.items = store.items.filter(i => !i.isSample);
        store.history = store.history.filter(h => !h.isSample);
        saveStore(store);
        sendJson(res, 200, { success: true, message: 'サンプルデータを削除しました（あなたのデータは残っています）' });
        return;
      }
      sendJson(res, 400, { error: 'Unknown action' });
      return;
    }

    // 8. データのエクスポート / バックアップ (APIキーは含めない)
    if (req.method === 'GET' && pathname === '/api/backup') {
      const store = loadStore();
      const date = new Date().toISOString().slice(0, 10);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="jev_learning_quest_backup_${date}.json"`
      });
      res.end(JSON.stringify(store, null, 2));
      return;
    }

    // 9. データのインポート
    if (req.method === 'POST' && pathname === '/api/backup') {
      const body = await parseJsonBody(req);
      if (!Array.isArray(body.items) || !Array.isArray(body.history)) {
        sendJson(res, 400, { error: 'バックアップファイルの形式が正しくありません' });
        return;
      }
      saveStore({ items: body.items, history: body.history });
      sendJson(res, 200, { success: true, message: `データを復元しました（素材 ${body.items.length}件 / 記録 ${body.history.length}件）` });
      return;
    }

    if (pathname.startsWith('/api/')) {
      sendJson(res, 404, { error: 'Not Found' });
      return;
    }

    // --- 静的ファイル配信 (public/ の外は配信しない) ---
    const filePath = path.resolve(PUBLIC_DIR, '.' + (pathname === '/' ? '/index.html' : decodeURIComponent(pathname)));
    if (filePath.startsWith(PUBLIC_DIR + path.sep) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      serveStaticFile(res, filePath);
      return;
    }

    sendJson(res, 404, { error: 'Not Found' });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    if (status === 500) console.error('Server Error:', err);
    sendJson(res, status, { error: status === 400 ? 'JSONの形式が正しくありません' : 'Internal Server Error', message: err.message });
  }
});

server.listen(PORT, HOST, () => {
  const info = getJevKeyInfo();
  const keyLabel = {
    env: '環境変数から読み込み済み (Jev 判断が有効)',
    saved: '画面で保存したキーを使用 (Jev 判断が有効)',
    none: '未設定 (ルールで動作中。画面の「設定」から入力できます)'
  }[info.source];
  console.log(`[${APP_NAME}] 起動しました: http://localhost:${PORT}`);
  console.log(`- データ保存先: ${DATA_FILE}`);
  console.log(`- Jev APIキー: ${keyLabel}`);
});
