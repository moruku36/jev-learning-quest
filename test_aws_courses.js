// AWS コース（基礎 / SAA / SAP）の一問一答と、旧分野（AI・クラウド・セキュリティ）の取り外しの回帰テスト。
// 一時フォルダと一時の保存先だけを使い、実データ・本番には触れない。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createApp } = require('./lib/app');
const { createFileStorage } = require('./lib/storage-file');
const content = require('./lib/content');
const { AWS_COURSES, AWS_CARDS, QUIZ_CARDS, QUIZ_CARD_MAP } = content;
const { ACTIVE_CATEGORIES, ARCHIVED_CATEGORIES } = require('./lib/categories');

// ---- 1. 問題データの整合性（件数・領域配分・出典・表記）----
const EXPECTED = {
  clf: { examCode: 'CLF-C02', counts: { d1: 8, d2: 12, d3: 14, d4: 5 }, weights: { d1: 24, d2: 30, d3: 34, d4: 12 } },
  saa: { examCode: 'SAA-C03', counts: { d1: 10, d2: 10, d3: 8, d4: 6 }, weights: { d1: 30, d2: 26, d3: 24, d4: 20 } },
  sap: { examCode: 'SAP-C02', counts: { d1: 7, d2: 9, d3: 7, d4: 7 }, weights: { d1: 26, d2: 29, d3: 25, d4: 20 } }
};
assert.deepEqual(AWS_COURSES.map(c => c.id), ['aif', 'clf', 'saa', 'sap']);
for (const course of AWS_COURSES.filter(c => c.id !== 'aif')) {
  const exp = EXPECTED[course.id];
  assert.equal(course.examCode, exp.examCode, `${course.id}: 現行の試験コード`);
  assert.deepEqual(Object.fromEntries(course.domains.map(d => [d.id, d.weight])), exp.weights, `${course.id}: 公式の出題領域の配分`);
  assert.equal(course.domains.reduce((n, d) => n + d.weight, 0), 100);
  const cards = AWS_CARDS.filter(c => c.course === course.id);
  for (const d of course.domains) {
    assert.equal(cards.filter(c => c.domain === d.id).length, exp.counts[d.id], `${course.id} ${d.id} の問題数`);
  }
  assert(cards.length >= 30, `${course.id}: 実際に学べる規模`);
  assert(cards.every(c => c.sources.length >= 1 && c.sources[0] === c.url));
  assert(/^https:\/\/docs\.aws\.amazon\.com\/aws-certification\/latest\//.test(course.guideUrl), '試験ガイドはAWS公式');
}
assert.equal(AWS_CARDS.length, 138);
assert.match(AWS_COURSES.find(c => c.id === 'sap').notice, /SAP-C03/, '次期試験は注記にとどめ、現行コードで作る');
assert(!AWS_COURSES.some(c => /C03/.test(c.examCode) && c.id === 'sap'));

const ids = new Set();
const questions = new Set();
for (const c of AWS_CARDS) {
  assert.match(c.id, /^aws-(aif|clf|saa|sap)-d[1-5]-\d{2}$/, `安定したID: ${c.id}`);
  assert(!ids.has(c.id), `ID重複: ${c.id}`);
  ids.add(c.id);
  assert(!questions.has(c.question), `問題文の重複（水増し）: ${c.question}`);
  questions.add(c.question);
  for (const k of ['question', 'answer', 'explanation', 'topic', 'field', 'examCode', 'checkedAt', 'kind']) assert(c[k], `${c.id}: ${k}`);
  assert(['term', 'scenario'].includes(c.kind));
  assert.match(c.url, /^https:\/\/(docs\.aws\.amazon\.com|aws\.amazon\.com)\//, `${c.id}: 根拠はAWS公式URL`);
  assert.match(c.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert(c.answer.length <= 160, `${c.id}: 正解は短く`);
  // 公式問題・合格保証と誤解される表記をしない
  assert(!/公式問題|本試験問題|合格保証|過去問/.test(`${c.question}${c.answer}${c.explanation}`), `${c.id}: 紛らわしい表記`);
}
// SAA/SAP には、短い状況に対する設計判断を問う問題が十分に含まれる
for (const id of ['saa', 'sap']) {
  const cards = AWS_CARDS.filter(c => c.course === id);
  assert(cards.filter(c => c.kind === 'scenario').length / cards.length >= 0.7, `${id}: 状況設計型の割合`);
}
// 近似重複（同じ答えの問題）と欠番: IDは詰めず、削除しても学習済みの問題のIDが変わらない
const answers = new Map();
for (const c of AWS_CARDS) {
  const key = c.answer.replace(/[\s。、]/g, '');
  assert(!answers.has(key), `答えが同一の近似重複: ${c.id} と ${answers.get(key)}`);
  answers.set(key, c.id);
}
const removed = ['aws-saa-d1-06', 'aws-saa-d3-01', 'aws-saa-d3-03', 'aws-saa-d4-06', 'aws-saa-d4-07', 'aws-saa-d1-08', 'aws-sap-d1-08', 'aws-sap-d3-03'];
for (const id of removed) assert(!AWS_CARDS.some(c => c.id === id), `${id} は近似重複のため出題しない`);
assert(AWS_CARDS.some(c => c.id === 'aws-saa-d4-08' && c.question), '欠番があっても後続のIDは変わらない');
// 公式サイトと公式ドキュメントの表記: aws.amazon.com は site、docs.aws.amazon.com は docs
for (const c of AWS_CARDS) {
  for (const u of c.sources) assert.match(u, /^https:\/\/(docs\.aws\.amazon\.com|aws\.amazon\.com)\//, `${c.id}: 根拠はAWS公式`);
  assert.equal(c.sourceKind, new URL(c.url).hostname === 'docs.aws.amazon.com' ? 'docs' : 'site', c.id);
}
// 解答に必要な前提を問題文に明示する（レビュー指摘の5問）。前提が変わると答えが変わる問題は、解説で代替案を示す
const byId = id => AWS_CARDS.find(c => c.id === id);
const mustMention = {
  'aws-saa-d2-06': { q: [/マルチAZ/, /データセンター（AZ）の障害/, /RTO・RPO/], e: [/リージョン全体の障害/, /パイロットライト/] },
  'aws-sap-d1-07': { q: [/コストと複雑さが低い順/], e: [/RTO・RPO/, /リージョン障害/] },
  'aws-sap-d2-09': { q: [/非同期/, /アプリ改修/], e: [/前提が成り立たない/, /インスタンスクラス/, /DynamoDB/] },
  'aws-sap-d2-04': { q: [/RPO/, /RTO/, /Aurora（MySQL互換またはPostgreSQL互換）/], e: [/Aurora以外のエンジン/, /リードレプリカ/, /DynamoDB/] },
  'aws-saa-d3-05': { q: [/繰り返しの読み取り/, /多少古いデータ/, /アプリにキャッシュ/], e: [/リードレプリカ/, /DAX/, /CloudFront/] }
};
for (const [id, need] of Object.entries(mustMention)) {
  const c = byId(id);
  assert(c, id);
  for (const re of need.q) assert.match(c.question, re, `${id}: 問題文に前提を明示`);
  for (const re of need.e) assert.match(c.explanation, re, `${id}: 解説に代替案・前提の違いを示す`);
}
assert(byId('aws-saa-d3-09').sources.length >= 3 && byId('aws-clf-d3-12').sources.length >= 3, 'Athena と VPN は本文を直接支える根拠ページも挙げる');
assert(byId('aws-saa-d3-05').sources.length >= 3 && byId('aws-sap-d2-09').sources.length >= 3 && byId('aws-saa-d2-08').sources.length >= 2, '代替案の根拠も挙げる');
// 数値の暗記に依存させない（条件つきの数値を答え・解説に置かない）
for (const id of ['aws-sap-d4-02', 'aws-saa-d3-07', 'aws-clf-d4-03', 'aws-clf-d4-05', 'aws-saa-d4-02']) {
  const c = byId(id);
  assert(!/\d+\s*(日|か月|TiB|TB)/.test(`${c.question}${c.answer}${c.explanation}`), `${id}: 条件つきの数値に依存しない`);
}
// SAP を必要以上に難しい演習と宣伝しない
const sapCourse = AWS_COURSES.find(c => c.id === 'sap');
assert(/本番形式の演習ではありません/.test(sapCourse.notice) && /想起/.test(sapCourse.notice));
const sapSource = fs.readFileSync(path.join(__dirname, 'lib/content/aws/sap-c02.js'), 'utf8')
  .split(/\r?\n/).filter(l => !l.startsWith('//')).join('\n');
assert(!/トレードオフを(問う|答える)/.test(sapSource));

// 旧IPA問題IDと衝突しない
assert.equal(QUIZ_CARDS.length, 1050 + 138 + 120);
assert.equal(QUIZ_CARD_MAP.size, QUIZ_CARDS.length);
assert(AWS_CARDS.every(c => !/^(sc|ap)-/.test(c.id)));

// ---- 2. 分野の定義（旧3分野は外し、ネットワーク・支援士は残す）----
assert.deepEqual(ACTIVE_CATEGORIES, ['nw', 'sc', 'aws', 'gcp']);
assert.deepEqual(ARCHIVED_CATEGORIES, ['ai', 'cloud', 'security']);
const appJs = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
const clientArchived = /const ARCHIVED_CATEGORIES = \[([^\]]*)\]/.exec(appJs);
assert(clientArchived, '画面側にも旧分野の定義がある');
assert.deepEqual(clientArchived[1].split(',').map(x => x.trim().replace(/['"]/g, '')), ARCHIVED_CATEGORIES, '画面と同じ旧分野');
const html = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
const pills = [...html.matchAll(/<button class="pill[^"]*" data-val="([^"]+)">([^<]+)<\/button>/g)];
const catPills = /id="catPills">([\s\S]*?)<\/div>/.exec(html)[1];
for (const old of ['ai', 'cloud', 'security']) assert(!new RegExp(`data-val="${old}"`).test(catPills), `分野ボタンに ${old} がない`);
for (const keep of ['all', 'nw', 'sc', 'aws', 'gcp']) assert(new RegExp(`data-val="${keep}"`).test(catPills), `分野ボタンに ${keep} がある`);
assert(/>ネットワーク</.test(catPills) && />支援士</.test(catPills) && />AWS</.test(catPills));
for (const gone of ['readingList', 'feedList', 'readingFilterPills', 'AI 大手のレポート', 'AI の新着']) assert(!html.includes(gone), `読み物の導線が残っていない: ${gone}`);
// 支援士の出題分野「セキュリティ」（一問一答の中分類）は残す
assert(content.FIELD_GROUPS.some(g => g.id === 'security' && g.name === 'セキュリティ'));
assert(pills.length > 0);

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aws-courses-'));
  const storage = createFileStorage(dir);
  const server = http.createServer(createApp({ mode: 'local', storage, publicDir: path.join(__dirname, 'public') }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (url, body) => {
    const r = await fetch(base + url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  try {
    // 旧データ: AI・クラウド・セキュリティの教材・履歴と、IPA/NW の既存記録、一問一答の既存進捗
    const legacyHist = ['ai', 'cloud', 'security'].map(cat => ({
      id: `legacy-${cat}`, itemId: `legacy-${cat}-item`, category: cat, title: `旧${cat}`, isCorrect: false, mistakeReason: '知識不足',
      nextReviewDate: '2020-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:00:00.000Z', understandingScore: 2
    }));
    const keptHist = { id: 'kept-sc', itemId: null, category: 'sc', title: '支援士の既存記録', isCorrect: true, completedAt: '2026-01-02T00:00:00.000Z', kind: 'quiz', quizResult: { total: 1, correct: 1 } };
    const ipaCard = QUIZ_CARDS.find(c => c.family === 'ipa');
    const seed = {
      items: ['ai', 'cloud', 'security'].map(cat => ({ id: `legacy-${cat}-item`, type: 'catchup', category: cat, title: `旧${cat}の記事`, nextAction: '試す' })),
      history: [...legacyHist, keptHist],
      quizProgress: { [ipaCard.id]: { box: 2, correct: 2, wrong: 0, last: '2026-01-01T00:00:00.000Z', due: '2026-01-04T00:00:00.000Z' } },
      quizReports: []
    };
    await storage.save(null, seed);
    const seedSnapshot = JSON.stringify(seed);

    // 取り外し: 読み物・新着はAPIに出ず、旧データは画面向けに出ない
    const c0 = (await call('/api/content')).data;
    assert.equal(c0.readings, undefined);
    assert.equal((await call('/api/ai-feed')).status, 404);
    assert.deepEqual(Object.keys(c0.quiz.exams).sort(), ['ap', 'sc'], '従来の一問一答の試験一覧はIPAのみ');
    assert.equal(c0.quiz.stats.all.total, 1050, '従来の集計（IPA）は変わらない');
    assert.equal(c0.quiz.stats.all.studied, 1);
    assert.equal(c0.aws.courses.length, 4);
    assert.deepEqual(c0.aws.courses.map(c => c.stats.total), [35, 39, 34, 30]);
    assert.equal(c0.aws.stats.total, 138);
    assert(c0.aws.courses.every(c => c.fields.length === c.domains.length));
    const h0 = (await call('/api/history')).data;
    assert(!h0.history.some(h => ARCHIVED_CATEGORIES.includes(h.category)), '履歴一覧に旧分野は出ない');
    assert(h0.history.some(h => h.id === 'kept-sc'), 'ネットワーク・支援士の記録は残る');
    assert.equal((await call('/api/registered-items')).data.items.length, 0, '旧分野の教材は一覧に出ない');
    for (const cat of ['all', 'ai', 'cloud', 'security', 'sc', 'nw', 'aws']) {
      for (const goal of ['balance', 'weakness', 'exercise', 'input']) {
        const rec = (await call('/api/quest/recommend', { minutes: 30, category: cat, goal })).data;
        assert(!rec.allCandidates.some(c => ARCHIVED_CATEGORIES.includes(c.category) || String(c.historyId || c.itemId || '').startsWith('legacy')), `${cat}/${goal}: 旧分野は再出現しない`);
        assert(!ARCHIVED_CATEGORIES.includes(rec.quest.category));
        assert(!rec.allCandidates.some(c => c.type === 'レポートを読む'));
      }
    }
    for (const cat of ['ai', 'cloud', 'security']) assert.equal((await call('/api/registered-items', { type: 'catchup', category: cat, title: 'x' })).status, 400);
    assert.equal(JSON.stringify(await storage.load(null)), seedSnapshot, '参照・推薦では保存データを変更しない（旧履歴は物理削除・更新されない）');

    // AWS: コース別の出題（答えも返す。選択式に戻さない）
    for (const course of AWS_COURSES) {
      const deck = (await call(`/api/quiz/deck?exam=${course.exam}&count=10`)).data.cards;
      assert.equal(deck.length, 10);
      assert(deck.every(c => c.exam === course.exam && c.family === 'aws' && c.question && c.answer && c.explanation && c.url && !c.choices));
    }
    const mixed = (await call('/api/quiz/deck?exam=aws&count=30')).data.cards;
    assert(new Set(mixed.map(c => c.exam)).size > 1, 'AWS全体は複数コースから出る');
    const ipaDeck = (await call('/api/quiz/deck?exam=all&count=30')).data.cards;
    assert(ipaDeck.every(c => c.family === 'ipa'), 'exam=all は従来どおりIPAのみ');
    assert.equal((await call('/api/quiz/deck?exam=aws-saa&group=aws-saa-d2&count=30')).data.cards.every(c => c.domain === 'd2'), true);

    // 答えを見ただけでは記録されない: デッキ取得は進捗を変えない
    const before = JSON.stringify((await storage.load(null)).quizProgress);
    const saa = (await call('/api/quiz/deck?exam=aws-saa&count=6')).data.cards;
    assert.equal(JSON.stringify((await storage.load(null)).quizProgress), before, '出題・答えの表示だけでは進捗も履歴も増えない');

    // 自己判定の保存: 覚えていた/覚えていない を本人の判定で記録する
    const judged = saa.map((c, i) => ({ id: c.id, correct: i % 2 === 0, confidence: 'medium' }));
    const saved = await call('/api/quiz/answers', { answers: judged, title: 'AWS SAA 一問一答', format: 'self', decisionSource: 'manual' });
    assert.equal(saved.status, 201);
    assert.equal(saved.data.history.category, 'aws', 'AWSだけを解いた回は分野 aws として記録');
    assert.deepEqual(saved.data.history.quizResult.courses, ['aws-saa']);
    assert.equal(saved.data.stats['aws-saa'].studied, 6);
    assert.equal(saved.data.stats['aws-clf'].studied, 0, '他コースの進捗は変わらない');
    assert.equal(saved.data.stats.all.studied, 1, 'IPA の進捗は変わらない');
    const stored = await storage.load(null);
    for (const a of judged) {
      const p = stored.quizProgress[a.id];
      assert.equal(a.correct ? p.correct : p.wrong, 1, '自己判定のとおりに1回だけ記録');
      assert.equal(p.box, a.correct ? 1 : 0);
    }
    assert.deepEqual(stored.history.filter(h => ARCHIVED_CATEGORIES.includes(h.category)).map(h => h.id).sort(), legacyHist.map(h => h.id).sort(), '旧履歴は保持される');
    assert.equal(stored.quizProgress[ipaCard.id].box, 2, '既存のIPA進捗は変わらない');

    // 復習・弱点・進捗がコース別に反映される
    const due = JSON.parse(JSON.stringify(stored));
    for (const a of judged.filter(a => !a.correct)) due.quizProgress[a.id].due = '2020-01-01T00:00:00.000Z';
    await storage.save(null, due);
    const h1 = (await call('/api/history')).data;
    assert.equal(h1.courseStats.saa.wrongDue, 3);
    assert.equal(h1.courseStats.clf.wrongDue, 0);
    assert.equal(h1.awsStats.wrongDue, 3);
    assert.equal(h1.quizStats.wrongDue, 0, 'IPA の復習件数にAWSが混ざらない');
    const reviewDeck = (await call('/api/quiz/deck?exam=aws-saa&mode=review&count=10')).data.cards;
    assert.deepEqual(reviewDeck.map(c => c.id).sort(), judged.filter(a => !a.correct).map(a => a.id).sort());
    assert.equal((await call('/api/quiz/deck?exam=aws-clf&mode=review&count=10')).data.cards.length, 0, '他コースの復習には出ない');
    // 弱点（5回以上解いた領域で正答率7割未満）はコース別
    const weakStore = JSON.parse(JSON.stringify(due));
    const clfD3 = AWS_CARDS.filter(c => c.exam === 'aws-clf' && c.domain === 'd3').slice(0, 6);
    for (const c of clfD3) weakStore.quizProgress[c.id] = { box: 0, correct: 0, wrong: 1, last: new Date().toISOString(), due: '2099-01-01T00:00:00.000Z' };
    await storage.save(null, weakStore);
    const c1 = (await call('/api/content')).data;
    assert.equal(c1.aws.courses.find(c => c.id === 'clf').fields.find(f => f.id === 'aws-clf-d3').weak, true);
    assert.equal(c1.aws.courses.find(c => c.id === 'saa').fields.some(f => f.weak), false, '他コースの弱点にならない');
    const weakDeck = (await call('/api/quiz/deck?exam=aws-clf&mode=weak&count=10')).data.cards;
    assert(weakDeck.length > 0 && weakDeck.every(c => c.domain === 'd3'));
    assert.equal((await call('/api/quiz/deck?exam=all&mode=weak&count=10')).data.cards.length, 0, 'IPAの弱点にAWSは入らない');

    // おすすめ: 分野 AWS ではコース別の候補。コース指定で絞れる
    const recAws = (await call('/api/quest/recommend', { minutes: 20, category: 'aws', goal: 'balance' })).data;
    assert(recAws.allCandidates.every(c => c.category === 'aws' && c.quiz));
    assert(recAws.allCandidates.some(c => c.quiz.exam === 'aws-clf' && c.quiz.mode === 'mix'));
    assert(recAws.allCandidates.some(c => c.quiz.exam === 'aws-sap' && c.quiz.mode === 'mix'));
    const recSaa = (await call('/api/quest/recommend', { minutes: 20, category: 'aws', awsCourse: 'saa', goal: 'balance' })).data;
    assert(recSaa.allCandidates.every(c => c.quiz.exam === 'aws-saa'), 'コースを選ぶとそのコースだけ');
    assert(recSaa.allCandidates.some(c => c.isReview), '復習期限が来た問題があれば復習が候補に入る');
    assert(!recSaa.allCandidates.some(c => c.quiz.exam === 'aws-clf'));
    const recAll = (await call('/api/quest/recommend', { minutes: 20, category: 'all', goal: 'balance' })).data;
    assert(recAll.allCandidates.some(c => c.id === 'aws_review'), 'すべてでは復習期限が来たAWSの問題だけが加わる');
    assert(!recAll.allCandidates.some(c => /^aws_(clf|saa|sap)$/.test(c.id)), 'すべてでは新規のAWS演習は押し付けない');
    assert.equal(recAll.allCandidates.filter(c => c.type === '一問一答' && !String(c.id).startsWith('aws')).every(c => c.category === 'sc'), true, 'IPAの一問一答は従来どおり');

    // 同じ判定の再送や保存済みの問題への再回答は、積み上がるだけで別カードを壊さない（重複記録の確認はUIテストで）
    assert.equal((await call('/api/quiz/answers', { answers: [{ id: 'aws-saa-zz-99', correct: true }] })).status, 400, '存在しないIDは拒否');
    assert.equal((await call('/api/quiz/reports', { cardId: saa[0].id, reason: '公式資料と内容が合っていない', note: 'テスト' })).status, 201);
    assert.equal((await call('/api/content')).data.quiz.reports[0].card.url, saa[0].url);

    // バックアップに旧データも新データも残る（復元しても旧履歴は消えない）
    const backup = (await call('/api/backup')).data;
    assert(backup.history.some(h => h.id === 'legacy-ai') && backup.items.some(i => i.id === 'legacy-cloud-item'));
    assert(Object.keys(backup.quizProgress).includes(saa[0].id));
    assert.equal((await call('/api/backup', backup)).status, 200);
    const restored = await storage.load(null);
    assert(restored.history.some(h => h.id === 'legacy-security') && restored.quizProgress[saa[0].id]);
  } finally {
    await new Promise(r => server.close(r));
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log('AWS courses: data integrity, course-scoped quiz/review/weak/recommendation, archived fields hidden and preserved, no ID collisions passed.');
})().catch(e => { console.error(e); process.exitCode = 1; });
