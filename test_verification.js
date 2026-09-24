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

// AI 新着のモック（RSS と Atom の両方）
const MOCK_FEED_XML = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Mock</title>
<item><title><![CDATA[Mock AI Security Update]]></title><link>https://example.com/ai/security-update</link><description>Summary &amp; details</description><pubDate>Wed, 23 Sep 2026 10:00:00 GMT</pubDate></item>
<item><title>Unsafe link</title><link>javascript:alert(1)</link><pubDate>Wed, 23 Sep 2026 09:00:00 GMT</pubDate></item>
</channel></rss>`;

// Claude API のモック（/v1/messages）。受け取ったリクエストを記録して、添削結果を返す
const CLAUDE_TEST_KEY = 'sk-ant-test-key';
const claudeRequests = [];

// --- モック Jev API: VALID_KEY のみ受け付け、候補の先頭を選ぶ ---
const mockJev = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    if (req.url === '/feed.xml') {
      res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
      res.end(MOCK_FEED_XML);
      return;
    }
    if (req.url.startsWith('/v1/messages')) {
      claudeRequests.push({ headers: req.headers, body: JSON.parse(body) });
      if (req.headers['x-api-key'] !== CLAUDE_TEST_KEY) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end('{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5',
        content: [{ type: 'text', text: '## 総合評価\nB（部分点が期待できる）' }],
        stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 }
      }));
      return;
    }
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

  console.log('\n=== [1-b] 以前のサンプルデータは表示しない ===');
  const { data: emptyItems } = await get('/api/registered-items');
  assert.deepStrictEqual(emptyItems.items, [], '初回は空のデータで始まる');
  fs.writeFileSync(path.join(dataDir, 'store.json'), JSON.stringify({
    items: [{ id: 'sample_sc_01', type: 'sc_past_paper', category: 'sc', title: '【サンプル】古いサンプル', isSample: true }],
    history: [{ id: 'sample_hist_01', itemId: 'sample_sc_01', category: 'sc', title: '【サンプル】古い記録', isCorrect: false, isSample: true }]
  }));
  const { data: afterSamples } = await get('/api/registered-items');
  assert.strictEqual(afterSamples.items.length, 0, '保存済みのサンプル素材は取り除かれる');
  const { data: histAfterSamples } = await get('/api/history');
  assert.strictEqual(histAfterSamples.history.length, 0, '保存済みのサンプル記録は取り除かれる');
  assert.strictEqual((await post('/api/seed', { action: 'add_samples' })).status, 404, 'サンプル追加の API は廃止');
  console.log('✔ 初回は空で始まり、以前のサンプルは自動で取り除かれる');

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

  console.log('\n=== [5-d] 分野別の正答率と弱点分野 ===');
  const { QUIZ_CARDS } = require('./lib/content');
  assert.ok(QUIZ_CARDS.every(c => c.field && c.group), 'すべての問題に分野（中分類）がある');
  const netCards = QUIZ_CARDS.filter(c => c.group === 'network').slice(0, 6);
  await post('/api/quiz/answers', { answers: netCards.map((c, i) => ({ id: c.id, correct: i === 0 })), title: '弱点テスト' });
  const { data: content4 } = await get('/api/content');
  const net = content4.quiz.fields.find(f => f.id === 'network');
  // [5-b] でランダムに解いた問題にネットワーク分野が含まれることがあるので、6回以上とする
  assert.ok(net.attempts >= 6 && net.attempts <= 11, `ネットワーク分野の解答数: ${net.attempts}`);
  assert.strictEqual(net.weak, true, '正答率 1/6 のネットワークは弱点');
  const { data: weakDeck } = await get('/api/quiz/deck?mode=weak&count=10');
  assert.strictEqual(weakDeck.cards.length, 10);
  assert.ok(weakDeck.cards.every(c => content4.quiz.fields.find(f => f.id === c.group).weak), '弱点分野の問題だけが出る');
  const { data: groupDeck } = await get('/api/quiz/deck?group=database&count=5');
  assert.ok(groupDeck.cards.every(c => c.group === 'database'));
  const recWeak = await post('/api/quest/recommend', { minutes: 20, category: 'sc', goal: 'weakness' });
  assert.ok(recWeak.data.allCandidates.some(c => c.id === 'quiz_weak' && c.quiz.mode === 'weak'), '弱点分野の集中演習が候補に入る');
  console.log('✔ 分野ごとの正答率が集計され、弱点分野だけを出題できる');

  console.log('\n=== [5-e] 4択と「この問題おかしい？」 ===');
  const { data: choiceDeck } = await get('/api/quiz/deck?exam=sc&count=5&format=choice');
  for (const c of choiceDeck.cards) {
    assert.strictEqual(c.choices.length, 4);
    assert.strictEqual(new Set(c.choices).size, 4, '選択肢は重複しない');
    assert.ok(c.choices.includes(c.answer), '正解が選択肢に含まれる');
  }
  const reported = await post('/api/quiz/reports', { cardId: choiceDeck.cards[0].id, reason: '答えが間違っている', note: 'テスト' });
  assert.strictEqual(reported.status, 201);
  assert.strictEqual((await post('/api/quiz/reports', { cardId: 'no-such-card' })).status, 400);
  const { data: content5 } = await get('/api/content');
  assert.strictEqual(content5.quiz.reports.length, 1);
  assert.strictEqual(content5.quiz.reports[0].card.id, choiceDeck.cards[0].id);
  await post('/api/quiz/reports/delete', { reportId: reported.data.report.id });
  assert.strictEqual((await get('/api/content')).data.quiz.reports.length, 0);
  console.log('✔ 4択は正解を含む重複のない4つの選択肢になり、問題の報告・削除ができる');

  console.log('\n=== [5-f] 支援士 午後/科目B と採点補助 ===');
  assert.strictEqual(content5.written.length, 45, '令和3年春期〜令和7年秋期の午後I/午後II/科目B');
  assert.ok(content5.written.every(w => /^https:\/\/www\.ipa\.go\.jp\/.+_qs\.pdf$/.test(w.questionPdf) && /_ans\.pdf$/.test(w.answerPdf)));
  const recWritten = await post('/api/quest/recommend', { minutes: 60, category: 'sc', goal: 'exercise' });
  const writtenCand = recWritten.data.allCandidates.find(c => c.id.startsWith('written_'));
  assert.ok(writtenCand && writtenCand.url && writtenCand.answerUrl, '午後/科目B の過去問が登録なしで候補に入る');
  const writtenRes = await post('/api/history', {
    itemId: writtenCand.itemId, category: 'sc', questType: '過去問を解く', title: writtenCand.title,
    userAnswer: '設問1: HttpOnly属性を付与し、ＸＳＳでのCookie窃取を防ぐ', isCorrect: false, mistakeReason: '知識不足',
    keywords: 'HttpOnly、XSS、SameSite'
  });
  assert.deepStrictEqual(writtenRes.data.keywordResult.matched, ['HttpOnly', 'XSS'], '全角の「ＸＳＳ」も一致する');
  assert.deepStrictEqual(writtenRes.data.keywordResult.missing, ['SameSite']);
  // 復習期限（3日後）を過去にして、再挑戦の候補になることを確認する
  const writtenStore = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
  writtenStore.history.find(h => h.id === writtenRes.data.history.id).nextReviewDate = new Date(Date.now() - 1000).toISOString();
  fs.writeFileSync(storeFile, JSON.stringify(writtenStore));
  const recWritten2 = await post('/api/quest/recommend', { minutes: 60, category: 'sc', goal: 'exercise' });
  assert.ok(!recWritten2.data.allCandidates.some(c => c.id === writtenCand.id), '演習した問題は新規の候補から外れる');
  const retryWritten = recWritten2.data.allCandidates.find(c => c.itemId === writtenCand.itemId && c.type === '誤答を直す');
  assert.ok(retryWritten && retryWritten.url, '「できなかった」問題は問題冊子のリンク付きで再挑戦になる');
  const noReview = await post('/api/review', { historyId: writtenRes.data.history.id });
  assert.strictEqual(noReview.status, 503, 'ANTHROPIC_API_KEY が無いときは添削できない');
  const { data: statusNoReview } = await get('/api/status');
  assert.strictEqual(statusNoReview.reviewConfigured, false);
  console.log('✔ 午後/科目B を登録なしで演習でき、キーワード照合の結果が返る');

  console.log('\n=== [5-g] AI の新着 ===');
  const { data: feed } = await get('/api/ai-feed');
  assert.strictEqual(feed.items.length, 1, 'https 以外のリンクは除外');
  assert.strictEqual(feed.items[0].title, 'Mock AI Security Update');
  assert.strictEqual(feed.items[0].summary, 'Summary & details');
  assert.strictEqual(feed.items[0].publishedAt, '2026-09-23T10:00:00.000Z');
  const { parseFeed } = require('./lib/feeds');
  const atom = parseFeed('<feed><entry><title>Atom Paper</title><link href="https://arxiv.org/abs/1234.5678v1" rel="alternate"/><published>2026-09-20T00:00:00Z</published><summary>abc</summary></entry></feed>', { id: 'a', name: 'arXiv' });
  assert.deepStrictEqual([atom[0].title, atom[0].url], ['Atom Paper', 'https://arxiv.org/abs/1234.5678v1']);
  console.log('✔ RSS / Atom の新着を読み、安全なリンクだけを返す');

  console.log('\n=== [5-h] PWA ===');
  const manifestRes = await fetch(`${BASE}/manifest.webmanifest`);
  assert.strictEqual(manifestRes.status, 200);
  assert.match(manifestRes.headers.get('content-type'), /manifest\+json/);
  const manifest = await manifestRes.json();
  assert.ok(manifest.icons.some(i => i.sizes === '512x512'));
  for (const icon of manifest.icons) assert.strictEqual((await fetch(`${BASE}/${icon.src}`)).status, 200, icon.src);
  const swText = await (await fetch(`${BASE}/sw.js`)).text();
  assert.match(swText, /\/api\//, 'Service Worker は /api/ をキャッシュしない');
  console.log('✔ マニフェスト・アイコン・Service Worker が配信される');

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

// Claude による添削（@anthropic-ai/sdk がインストールされている環境 = CI / Vercel でのみ実行）
async function runReviewVerification(base) {
  console.log('\n=== [12] Claude による記述答案の添削 ===');
  const call = async (p, body) => {
    const res = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
  const status = await (await fetch(`${base}/api/status`)).json();
  assert.strictEqual(status.reviewConfigured, true);
  const saved = await call('/api/history', {
    itemId: 'written:sc-07_aki-pm-1', category: 'sc', questType: '過去問を解く', title: '令和7年秋期 科目B 問1',
    userAnswer: '設問1: 多要素認証を導入する', isCorrect: true, keywords: '多要素認証、条件付きアクセス',
    questionText: '設問1 不正ログインを防ぐ対策を述べよ。'
  });
  const reviewed = await call('/api/review', { historyId: saved.data.history.id });
  assert.strictEqual(reviewed.status, 200, JSON.stringify(reviewed.data));
  assert.match(reviewed.data.review.feedback, /総合評価/);
  const sent = claudeRequests[claudeRequests.length - 1];
  assert.strictEqual(sent.body.model, 'claude-opus-5');
  assert.strictEqual(sent.body.fallbacks, 'default');
  assert.match(sent.headers['anthropic-beta'] || '', /server-side-fallback-2026-07-01/);
  assert.deepStrictEqual(sent.body.thinking, { type: 'adaptive' });
  const userText = JSON.stringify(sent.body.messages);
  assert.ok(userText.includes('多要素認証を導入する') && userText.includes('不正ログインを防ぐ対策'), '答案と設問を送る');
  const notFound = await call('/api/review', { historyId: 'no-such-history' });
  assert.strictEqual(notFound.status, 404);
  console.log('✔ Claude（claude-opus-5・フォールバック有効）で添削し、結果を学習記録に保存する');
}

function hasAnthropicSdk() {
  try {
    require.resolve('@anthropic-ai/sdk');
    return true;
  } catch (e) {
    return false;
  }
}

function startServer(port, env) {
  const proc = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env: {
      ...process.env,
      PORT: String(port),
      JEV_API_URL: `http://127.0.0.1:${MOCK_PORT}/v1/systemone`,
      LQ_TEST_FEED_URL: `http://127.0.0.1:${MOCK_PORT}/feed.xml`,
      ANTHROPIC_API_KEY: '',
      ...env
    },
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
const REVIEW_PORT = 3994;
const reviewDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-lq-review-'));
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
  const reviewEnabled = hasAnthropicSdk();
  if (reviewEnabled) {
    procs.push(startServer(REVIEW_PORT, {
      ...clearCloudEnv,
      LQ_DATA_DIR: reviewDataDir,
      JEV_API_KEY: '',
      ANTHROPIC_API_KEY: CLAUDE_TEST_KEY,
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`
    }));
  }

  let exitCode = 0;
  try {
    await waitForServer();
    await runVerification();
    await waitFor(`http://127.0.0.1:${CLOUD_PORT}`);
    await runCloudVerification(`http://127.0.0.1:${CLOUD_PORT}`);
    await waitFor(`http://127.0.0.1:${BROKEN_PORT}`);
    await runMisconfiguredVerification(`http://127.0.0.1:${BROKEN_PORT}`);
    if (reviewEnabled) {
      await waitFor(`http://127.0.0.1:${REVIEW_PORT}`);
      await runReviewVerification(`http://127.0.0.1:${REVIEW_PORT}`);
    } else {
      console.log('\n（@anthropic-ai/sdk が未インストールのため、Claude 添削のテスト [12] は省略しました。CI では npm install 後に実行されます）');
    }

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
    fs.rmSync(reviewDataDir, { recursive: true, force: true });
    process.exit(exitCode);
  }
}));
