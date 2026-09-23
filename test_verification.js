// Jev 学習クエスト 自動検証スクリプト (npm test)
// 一時データフォルダとモックの Jev API を用意してサーバーを起動するため、
// 実データ (data/) や本物の Jev API には一切触れません。
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PORT = 3999;
const MOCK_PORT = 3998;
const BASE = `http://127.0.0.1:${PORT}`;
const VALID_KEY = 'jev_test_valid_key_123456';
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-lq-test-'));

// --- モック Jev API: VALID_KEY のみ受け付け、候補の先頭を選ぶ ---
const mockJev = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    if (req.headers.authorization !== `Bearer ${VALID_KEY}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end('{"error":"invalid api key"}');
      return;
    }
    const { questions } = JSON.parse(body);
    const answers = {};
    for (const [name, q] of Object.entries(questions)) {
      if (q.type === 'choice') answers[name] = { choice: Object.keys(q.criteria)[0], confidence: 0.9 };
      // 実際の Jev と同じ形式: score は 0〜3 の連続値、noul は「はい」の確率
      if (q.type === 'score') answers[name] = { type: 'score', score: 2.67, confidence: 0.67 };
      if (q.type === 'noul') answers[name] = { type: 'noul', noul: 0.44 };
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ answers }));
  });
});

async function post(p, body, headers = { 'Content-Type': 'application/json' }) {
  const res = await fetch(BASE + p, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function get(p) {
  const res = await fetch(BASE + p);
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${BASE}/api/status`);
      return;
    } catch (e) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  throw new Error('サーバーが起動しませんでした');
}

async function runVerification() {
  console.log('=== [1] キー未設定時の動作 ===');
  const { data: status } = await get('/api/status');
  assert.strictEqual(status.appName, 'Jev 学習クエスト');
  assert.strictEqual(status.jevConfigured, false);
  assert.strictEqual(status.keySource, 'none');
  console.log('✔ JEV_API_KEY 未設定でも起動し、ルール動作と認識される');

  console.log('\n=== [2] 学習素材の登録 ===');
  const regSC = await post('/api/registered-items', {
    type: 'sc_past_paper',
    category: 'sc',
    title: '令和6年春期 支援士 科目B 問3 (DNSSEC)',
    source: 'IPA 過去問題 令和6年春期',
    questionText: '設問2: DNSSECが提供するセキュリティ機能を2つ答えよ。',
    notes: 'データの完全性と発信元認証'
  });
  assert.strictEqual(regSC.data.success, true);
  const scItemId = regSC.data.item.id;

  const regCU = await post('/api/registered-items', {
    type: 'catchup',
    category: 'security',
    title: 'ゼロトラストにおけるmTLS運用設計ガイド',
    source: 'セキュリティ専門機関 レポート',
    nextAction: '設定を確認する'
  });
  assert.strictEqual(regCU.data.item.nextAction, '設定を確認する');
  console.log('✔ 過去問と記事（出典・次の行動付き）を登録できる');

  console.log('\n=== [3] ルールでのクエスト推薦 ===');
  const rec = await post('/api/quest/recommend', { minutes: 30, category: 'sc', goal: 'exercise' });
  assert.ok(rec.data.quest);
  assert.strictEqual(rec.data.decisionSource, 'rule');
  console.log('✔ 推薦:', rec.data.quest.title);

  console.log('\n=== [4] 誤答の記録と再挑戦クエスト ===');
  const miss = await post('/api/history', {
    itemId: scItemId,
    category: 'sc',
    questType: '過去問を解く',
    title: 'DNSSEC 初回演習',
    userAnswer: 'データの暗号化とアクセス制御',
    isCorrect: false,
    mistakeReason: '知識不足'
  });
  assert.strictEqual(miss.status, 201);
  assert.strictEqual(miss.data.evaluation.needsReview, true);
  assert.strictEqual(miss.data.answerNotes, 'データの完全性と発信元認証', '完了後に解答ポイントが返る');
  const missId = miss.data.history.id;

  // 復習期限を過去にして、再挑戦が最優先になることを確認
  const storeFile = path.join(dataDir, 'store.json');
  const store = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
  store.history.find(h => h.id === missId).nextReviewDate = new Date(Date.now() - 1000).toISOString();
  fs.writeFileSync(storeFile, JSON.stringify(store));

  const recReview = await post('/api/quest/recommend', { minutes: 20, category: 'sc', goal: 'weakness' });
  assert.strictEqual(recReview.data.quest.type, '誤答を直す');
  assert.strictEqual(recReview.data.quest.historyId, missId);
  console.log('✔ 誤答が再挑戦クエストとして最優先で推薦される');

  console.log('\n=== [5] 再挑戦に正解すると克服済みになる ===');
  const retry = await post('/api/history', {
    itemId: scItemId,
    retryOf: missId,
    category: 'sc',
    questType: '誤答を直す',
    title: '【再挑戦】DNSSEC',
    userAnswer: 'データの完全性と発信元認証',
    isCorrect: true
  });
  assert.strictEqual(retry.data.resolvedHistoryId, missId);
  const { data: hist } = await get('/api/history');
  assert.strictEqual(hist.history.find(h => h.id === missId).resolved, true);
  const recAfter = await post('/api/quest/recommend', { minutes: 20, category: 'sc', goal: 'weakness' });
  assert.notStrictEqual(recAfter.data.quest.historyId, missId, '克服済みは再出題されない');
  console.log('✔ 克服済みの誤答は復習リストと推薦から外れる');

  console.log('\n=== [5-b] 一問一答（過去問5年分）===');
  const { data: content } = await get('/api/content');
  assert.strictEqual(content.quiz.stats.ap.total, 800, '応用情報 午前 80問×10回');
  assert.strictEqual(content.quiz.stats.sc.total, 250, '支援士 午前II 25問×10回');
  assert.strictEqual(content.quiz.sessions.length, 10);
  assert.strictEqual(content.quiz.sessions[0].label, '令和7年秋期', '新しい回が先頭');
  console.log('✔ 応用情報 800問 + 支援士 250問が同梱されている');

  const recQuiz = await post('/api/quest/recommend', { minutes: 10, category: 'sc', goal: 'balance' });
  const quizCand = recQuiz.data.allCandidates.find(c => c.id === 'quiz_sc');
  assert.ok(quizCand, '支援士の一問一答が候補に入る');
  assert.deepStrictEqual(quizCand.quiz, { exam: 'sc', mode: 'mix', count: 10 }, '10分なら10問');
  assert.ok(recQuiz.data.allCandidates.some(c => c.id === 'quiz_ap'));
  assert.ok(!recQuiz.data.allCandidates.some(c => c.type === 'レポートを読む'), '支援士を選んだときはAIレポートを出さない');
  console.log('✔ 一問一答がクエスト候補になる（出題数は使える時間から決まる）');

  const { data: deck } = await get('/api/quiz/deck?exam=sc&session=07_aki&count=5');
  assert.strictEqual(deck.cards.length, 5);
  assert.ok(deck.cards.every(c => c.exam === 'sc' && c.session === '07_aki' && c.question && c.answer));
  assert.match(deck.cards[0].url, /^https:\/\/www\.sc-siken\.com\/kakomon\/07_aki\/am2_\d+\.html$/);
  const { data: apDeck } = await get('/api/quiz/deck?exam=ap&count=3');
  assert.match(apDeck.cards[0].url, /^https:\/\/www\.ap-siken\.com\/kakomon\/\d{2}_(haru|aki)\/q\d+\.html$/);
  console.log('✔ 試験・回を指定して出題でき、元の過去問ページへのリンクが付く');

  const answers = deck.cards.map((c, i) => ({ id: c.id, correct: i >= 2 }));
  const quizRes = await post('/api/quiz/answers', { answers, title: '一問一答テスト', decisionSource: 'rule' });
  assert.strictEqual(quizRes.status, 201);
  assert.strictEqual(quizRes.data.summary, '5問中3問正解（正答率60%）');
  assert.deepStrictEqual(quizRes.data.wrongCards.map(c => c.id), [deck.cards[0].id, deck.cards[1].id]);
  assert.strictEqual(quizRes.data.history.kind, 'quiz');
  assert.strictEqual(quizRes.data.stats.sc.studied, 5);
  assert.strictEqual((await post('/api/quiz/answers', { answers: [] })).status, 400);
  assert.strictEqual((await post('/api/quiz/answers', { answers: [{ id: 'no-such-card', correct: true }] })).status, 400);
  console.log('✔ 結果を保存するとカードごとの進捗と学習記録が残る / 不正な入力は400');

  const recAfterQuiz = await post('/api/quest/recommend', { minutes: 20, category: 'sc', goal: 'weakness' });
  assert.ok(!recAfterQuiz.data.allCandidates.some(c => c.historyId === quizRes.data.history.id), '一問一答の記録は記述の再挑戦にしない');
  const newDeck = await get('/api/quiz/deck?exam=sc&session=07_aki&mode=new&count=30');
  assert.strictEqual(newDeck.data.cards.length, 20, '解いた5問は「新しい問題」から外れる');

  // 間違えた問題の復習期限を過去にすると、復習として先に出る
  const quizStore = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
  for (const c of deck.cards.slice(0, 2)) quizStore.quizProgress[c.id].due = new Date(Date.now() - 1000).toISOString();
  fs.writeFileSync(storeFile, JSON.stringify(quizStore));
  const reviewDeck = await get('/api/quiz/deck?mode=review&count=10');
  assert.deepStrictEqual(reviewDeck.data.cards.map(c => c.id).sort(), [deck.cards[0].id, deck.cards[1].id].sort());
  const recQuizReview = await post('/api/quest/recommend', { minutes: 20, category: 'sc', goal: 'balance' });
  assert.ok(recQuizReview.data.allCandidates.some(c => c.id === 'quiz_review'), '復習期限が来たら復習の一問一答が候補に入る');
  const { data: histWithQuiz } = await get('/api/history');
  assert.strictEqual(histWithQuiz.quizStats.wrongDue, 2);
  console.log('✔ 間違えた問題は翌日以降に復習として優先して出題される');

  console.log('\n=== [5-c] AI レポート・論文 ===');
  assert.strictEqual(content.readings.length, 36);
  assert.ok(content.readings.every(r => /^https:\/\//.test(r.url) && r.org && r.focus && r.task));
  const recAi = await post('/api/quest/recommend', { minutes: 20, category: 'ai', goal: 'input' });
  const readingCands = recAi.data.allCandidates.filter(c => c.type === 'レポートを読む');
  assert.strictEqual(readingCands.length, 3, '未読のレポートを3件まで提案');
  assert.strictEqual(recAi.data.quest.type, 'レポートを読む', '「サクッと情報収集」ではレポートも選ばれる');
  const firstReading = readingCands[0];
  await post('/api/history', {
    itemId: firstReading.itemId, category: 'ai', questType: 'レポートを読む',
    title: firstReading.title, userAnswer: '要点メモ', isCorrect: true
  });
  const recAi2 = await post('/api/quest/recommend', { minutes: 20, category: 'ai', goal: 'input' });
  assert.ok(!recAi2.data.allCandidates.some(c => c.id === firstReading.id), '読了したレポートは提案しない');
  const { data: content2 } = await get('/api/content');
  assert.strictEqual(content2.readings.find(r => r.itemId === firstReading.itemId).done, true);
  console.log('✔ AI 大手のレポートが候補になり、読了すると次の未読に進む');

  const { data: fullBackup } = await get('/api/backup');
  assert.ok(fullBackup.quizProgress && Object.keys(fullBackup.quizProgress).length === 5);
  await post('/api/backup', fullBackup);
  const { data: content3 } = await get('/api/content');
  assert.strictEqual(content3.quiz.stats.sc.studied, 5, 'バックアップから一問一答の進捗も復元される');
  console.log('✔ 一問一答の進捗もバックアップ・復元される');

  console.log('\n=== [6] Jev APIキーの保存・マスク・削除 ===');
  const badTest = await post('/api/settings/test-jev', { apiKey: 'jev_wrong_key_000000' });
  assert.strictEqual(badTest.data.success, false);
  assert.match(badTest.data.error, /無効/);
  assert.strictEqual(badTest.data.errorType, 'auth');
  console.log('✔ 無効なキーの接続テストは分かりやすいエラーになる');

  const saved = await post('/api/settings/jev-key', { apiKey: `  ${VALID_KEY}  ` });
  assert.strictEqual(saved.data.success, true);
  assert.strictEqual(saved.data.keySource, 'saved');
  assert.strictEqual(saved.data.maskedKey, 'jev_••••3456');
  assert.ok(!JSON.stringify(saved.data).includes(VALID_KEY), 'キー全体はレスポンスに含めない');
  const config = JSON.parse(fs.readFileSync(path.join(dataDir, 'config.json'), 'utf8'));
  assert.strictEqual(config.jevApiKey, VALID_KEY);
  console.log('✔ キーは data/config.json に保存され、画面にはマスク表示のみ');

  const goodTest = await post('/api/settings/test-jev', {});
  assert.strictEqual(goodTest.data.success, true);
  console.log('✔ 保存済みキーで接続テストが成功する');

  const recJev = await post('/api/quest/recommend', { minutes: 20, category: 'all' });
  assert.strictEqual(recJev.data.decisionSource, 'jev');
  const evalJev = await post('/api/history', { category: 'ai', title: 'Jev評価テスト', userAnswer: 'x', isCorrect: true });
  assert.strictEqual(evalJev.data.evaluation.decisionSource, 'jev');
  assert.strictEqual(evalJev.data.evaluation.understandingScore, 4, 'score 2.67 は 4段階の4');
  assert.strictEqual(evalJev.data.evaluation.needsReview, false, 'noul 0.44 (<0.5) は復習不要');
  console.log('✔ キー保存後はクエスト選定と評価に Jev が使われる');

  const { data: backup } = await get('/api/backup');
  assert.ok(!JSON.stringify(backup).includes(VALID_KEY), 'バックアップにキーを含めない');
  console.log('✔ バックアップにAPIキーは含まれない');

  const cleared = await post('/api/settings/jev-key', { apiKey: '' });
  assert.strictEqual(cleared.data.jevConfigured, false);
  const recRule = await post('/api/quest/recommend', { minutes: 20, category: 'all' });
  assert.strictEqual(recRule.data.decisionSource, 'rule');
  console.log('✔ キーを削除するとルール動作に戻る');

  console.log('\n=== [7] 安全性 ===');
  const formPost = await post('/api/settings/jev-key', 'apiKey=evil', { 'Content-Type': 'text/plain' });
  assert.strictEqual(formPost.status, 415);
  const statusRes = await fetch(`${BASE}/api/status`);
  assert.strictEqual(statusRes.headers.get('access-control-allow-origin'), null);
  const traversal = await fetch(`${BASE}/..%2fserver.js`);
  assert.strictEqual(traversal.status, 404);
  const badJson = await post('/api/history', '{broken', { 'Content-Type': 'application/json' });
  assert.strictEqual(badJson.status, 400);
  console.log('✔ JSON以外のPOST拒否 / CORS無効 / public外のファイル非公開 / 不正JSONは400');

  const { SECURITY_HEADERS } = require('./lib/security');
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    assert.strictEqual(statusRes.headers.get(key), value, `${key} ヘッダー`);
  }
  const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, 'vercel.json'), 'utf8'));
  const vercelHeaders = Object.fromEntries(vercel.headers.find(h => h.source === '/(.*)').headers.map(h => [h.key, h.value]));
  assert.deepStrictEqual(vercelHeaders, SECURITY_HEADERS, 'vercel.json のセキュリティヘッダーが lib/security.js と一致');
  console.log('✔ セキュリティヘッダー (CSP / HSTS / X-Frame-Options など) がローカル・Vercel で同一');
}

// --- クラウド版 (Supabase) のモック ---
// 本物の Supabase と同じく「トークンの持ち主」と「許可リスト」で行レベルのアクセスを制限する
const SB_ANON_KEY = 'sb_publishable_test_anon_key';
const SB_USERS = {
  'token-alice': { id: 'u-alice', email: 'Alice@Example.com' },
  'token-mallory': { id: 'u-mallory', email: 'mallory@example.com' }
};
const SB_ALLOWED = new Set(['alice@example.com']);
const sbRows = new Map(); // user_id -> data

const mockSupabase = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const user = SB_USERS[(req.headers.authorization || '').replace('Bearer ', '')];
  const send = (status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  if (req.headers.apikey !== SB_ANON_KEY) return send(401, { message: 'invalid apikey' });
  if (!user) return send(401, { message: 'invalid JWT' });
  const allowed = SB_ALLOWED.has(user.email.toLowerCase());

  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    if (u.pathname === '/auth/v1/user') return send(200, user);
    if (u.pathname === '/rest/v1/allowed_users') {
      const email = (u.searchParams.get('email') || '').replace('eq.', '');
      // RLS: 自分のメールアドレスの行だけ見える
      return send(200, allowed && email === user.email.toLowerCase() ? [{ email }] : []);
    }
    if (u.pathname === '/rest/v1/user_data' && req.method === 'GET') {
      const id = (u.searchParams.get('user_id') || '').replace('eq.', '');
      return send(200, allowed && id === user.id && sbRows.has(id) ? [{ data: sbRows.get(id) }] : []);
    }
    if (u.pathname === '/rest/v1/user_data' && req.method === 'POST') {
      const row = JSON.parse(body);
      if (!allowed || row.user_id !== user.id) return send(403, { message: 'new row violates row-level security policy' });
      sbRows.set(row.user_id, row.data);
      res.writeHead(201);
      return res.end();
    }
    send(404, {});
  });
});

async function runCloudVerification(base) {
  const call = async (p, { token, body, method } = {}) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + p, { method: method || (body !== undefined ? 'POST' : 'GET'), headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };

  console.log('\n=== [8] クラウド版: 公開設定 ===');
  const config = await call('/api/config');
  assert.strictEqual(config.data.mode, 'cloud');
  assert.strictEqual(config.data.supabaseAnonKey, SB_ANON_KEY);
  assert.ok(!JSON.stringify(config.data).includes(VALID_KEY), 'Jev キーはブラウザに渡さない');
  console.log('✔ ブラウザには Supabase の公開情報だけを渡し、Jev キーは渡さない');

  console.log('\n=== [9] クラウド版: ログインと許可リスト ===');
  assert.strictEqual((await call('/api/status')).status, 401);
  assert.strictEqual((await call('/api/history', { token: 'forged-token' })).status, 401);
  const mallory = await call('/api/registered-items', { token: 'token-mallory' });
  assert.strictEqual(mallory.status, 403);
  assert.match(mallory.data.error, /許可されていません/);
  console.log('✔ 未ログイン・偽トークンは 401、許可リスト外のユーザーは 403');

  const status = await call('/api/status', { token: 'token-alice' });
  assert.strictEqual(status.status, 200);
  assert.strictEqual(status.data.user.email, 'Alice@Example.com');
  assert.strictEqual(status.data.keySource, 'env');
  assert.strictEqual(status.data.keyEditable, false);
  console.log('✔ 許可されたユーザーはログインでき、Jev キーは環境変数から読み込まれる');

  console.log('\n=== [10] クラウド版: データ保存と Jev ===');
  const reg = await call('/api/registered-items', {
    token: 'token-alice',
    body: { type: 'catchup', category: 'ai', title: 'クラウド版テスト記事', source: 'テスト', url: 'javascript:alert(1)' }
  });
  assert.strictEqual(reg.status, 201);
  assert.strictEqual(reg.data.item.url, '', 'javascript: URL は保存しない');
  assert.ok(sbRows.get('u-alice').items.some(i => i.title === 'クラウド版テスト記事'), 'Supabase のユーザー本人の行に保存');
  assert.ok(!sbRows.has('u-mallory'));
  const rec = await call('/api/quest/recommend', { token: 'token-alice', body: { minutes: 20, category: 'all' } });
  assert.strictEqual(rec.data.decisionSource, 'jev');
  console.log('✔ データはユーザー本人の行に保存され、Jev がクエストを選ぶ');

  const setKey = await call('/api/settings/jev-key', { token: 'token-alice', body: { apiKey: 'jev_other' } });
  assert.strictEqual(setKey.status, 409);
  const testOther = await call('/api/settings/test-jev', { token: 'token-alice', body: { apiKey: 'jev_wrong_key_000000' } });
  assert.strictEqual(testOther.data.success, true, '入力されたキーは無視し、環境変数のキーだけをテストする');
  console.log('✔ クラウド版では画面からキーを変更できず、任意のキーでの外部呼び出しもできない');
}

async function runMisconfiguredVerification(base) {
  console.log('\n=== [11] クラウド版: 設定不足時は安全側に倒す ===');
  const config = await (await fetch(`${base}/api/config`)).json();
  assert.strictEqual(config.mode, 'cloud');
  assert.match(config.configError, /SUPABASE_URL/);
  const res = await fetch(`${base}/api/registered-items`);
  assert.strictEqual(res.status, 503);
  console.log('✔ Supabase 未設定の Vercel 環境では、ログインなしで使えてしまうことはなく全 API が 503');
}

function startServer(port, env) {
  const proc = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env: { ...process.env, PORT: String(port), JEV_API_URL: `http://127.0.0.1:${MOCK_PORT}/v1/systemone`, ...env },
    stdio: ['ignore', 'ignore', 'inherit']
  });
  return proc;
}

async function waitFor(base) {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${base}/api/config`);
      return;
    } catch (e) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  throw new Error(`サーバーが起動しませんでした: ${base}`);
}

const MOCK_SB_PORT = 3997;
const CLOUD_PORT = 3996;
const BROKEN_PORT = 3995;
const procs = [];

mockJev.listen(MOCK_PORT, '127.0.0.1', () => mockSupabase.listen(MOCK_SB_PORT, '127.0.0.1', async () => {
  const clearCloudEnv = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '', VERCEL: '' };
  procs.push(startServer(PORT, { ...clearCloudEnv, LQ_DATA_DIR: dataDir, JEV_API_KEY: '' }));
  procs.push(startServer(CLOUD_PORT, {
    SUPABASE_URL: `http://127.0.0.1:${MOCK_SB_PORT}`,
    SUPABASE_ANON_KEY: SB_ANON_KEY,
    LQ_ALLOW_INSECURE_SUPABASE: '1',
    JEV_API_KEY: VALID_KEY,
    VERCEL: ''
  }));
  procs.push(startServer(BROKEN_PORT, { ...clearCloudEnv, VERCEL: '1', JEV_API_KEY: '' }));

  let exitCode = 0;
  try {
    await waitForServer();
    await runVerification();
    await waitFor(`http://127.0.0.1:${CLOUD_PORT}`);
    await runCloudVerification(`http://127.0.0.1:${CLOUD_PORT}`);
    await waitFor(`http://127.0.0.1:${BROKEN_PORT}`);
    await runMisconfiguredVerification(`http://127.0.0.1:${BROKEN_PORT}`);

    console.log('\n=========================================');
    console.log('🎉 すべての自動検証をパスしました');
    console.log('=========================================');
  } catch (err) {
    console.error('❌ 検証失敗:', err);
    exitCode = 1;
  } finally {
    procs.forEach(p => p.kill());
    mockJev.close();
    mockSupabase.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
    process.exit(exitCode);
  }
}));
