// 一問一答の出題と学習進捗（間隔反復）
// 進捗は store.quizProgress = { [cardId]: { box, correct, wrong, last, due } } に保存する。
//   box: 0〜5。正解で1つ上がり、間違えると0に戻る。box に応じて次の出題日を延ばす
// 「この問題おかしい？」の報告は store.quizReports = [{ id, cardId, reason, note, createdAt }] に保存する。
const { QUIZ_CARDS, QUIZ_CARD_MAP, QUIZ_EXAMS, FIELD_GROUPS } = require('./content');

const DAY_MS = 86400000;
// 正解後の box ごとの復習間隔（日）。間違えた問題は翌日にもう一度出す
const BOX_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60];
const MAX_BOX = BOX_INTERVAL_DAYS.length - 1;
const MAX_DECK_SIZE = 30;
// 弱点分野と判定するのに必要な解答数と、弱点とみなす正答率
const WEAK_MIN_ATTEMPTS = 5;
const WEAK_ACCURACY = 0.7;
const MAX_WEAK_GROUPS = 3;
const MAX_REPORTS = 200;
const REPORT_REASONS = ['答えが間違っている', '問題文が分かりにくい', '元の過去問と内容が合っていない', 'その他'];

function progressOf(store) {
  return store.quizProgress && typeof store.quizProgress === 'object' ? store.quizProgress : {};
}

function isDue(p, now) {
  return Boolean(p && p.due && new Date(p.due).getTime() <= now);
}

// 試験ごとの進捗の集計
function quizStats(store, now = Date.now()) {
  const progress = progressOf(store);
  const byExam = {};
  for (const exam of Object.keys(QUIZ_EXAMS)) {
    byExam[exam] = { total: 0, studied: 0, mastered: 0, due: 0, wrongDue: 0 };
  }
  for (const card of QUIZ_CARDS) {
    const s = byExam[card.exam];
    const p = progress[card.id];
    s.total++;
    if (!p) continue;
    s.studied++;
    if (p.box >= 3) s.mastered++;
    if (isDue(p, now)) {
      s.due++;
      if (p.box === 0) s.wrongDue++;
    }
  }
  const all = Object.values(byExam).reduce((acc, s) => {
    for (const k of Object.keys(acc)) acc[k] += s[k];
    return acc;
  }, { total: 0, studied: 0, mastered: 0, due: 0, wrongDue: 0 });
  return { ...byExam, all };
}

// 分野（中分類）ごとの正答率。解答数が少ない分野は accuracy を null にする
function fieldStats(store, { exam = 'all' } = {}) {
  const progress = progressOf(store);
  const stats = new Map(FIELD_GROUPS.map(g => [g.id, {
    id: g.id, name: g.name, area: g.area, total: 0, studied: 0, correct: 0, attempts: 0, accuracy: null, weak: false
  }]));
  for (const card of QUIZ_CARDS) {
    if (exam !== 'all' && card.exam !== exam) continue;
    const s = stats.get(card.group);
    s.total++;
    const p = progress[card.id];
    if (!p) continue;
    s.studied++;
    s.correct += p.correct;
    s.attempts += p.correct + p.wrong;
  }
  const list = [...stats.values()].filter(s => s.total > 0);
  for (const s of list) {
    if (s.attempts >= WEAK_MIN_ATTEMPTS) s.accuracy = s.correct / s.attempts;
  }
  // 正答率が基準未満の分野のうち、低い順に最大3つを弱点とする
  list.filter(s => s.accuracy !== null && s.accuracy < WEAK_ACCURACY)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, MAX_WEAK_GROUPS)
    .forEach(s => { s.weak = true; });
  return list;
}

function weakGroups(store) {
  return fieldStats(store).filter(s => s.weak).sort((a, b) => a.accuracy - b.accuracy);
}

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 4択の選択肢: 正解 + 同じ分野（足りなければ同じ試験）の別の問題の答え3つ
function buildChoices(card) {
  const used = new Set([card.answer]);
  const distractors = [];
  const pools = [
    QUIZ_CARDS.filter(c => c.group === card.group && c.exam === card.exam),
    QUIZ_CARDS.filter(c => c.group === card.group),
    QUIZ_CARDS.filter(c => c.exam === card.exam)
  ];
  for (const pool of pools) {
    for (const c of shuffle(pool)) {
      if (distractors.length >= 3) break;
      if (c.id === card.id || used.has(c.answer)) continue;
      used.add(c.answer);
      distractors.push(c.answer);
    }
  }
  return shuffle([card.answer, ...distractors]);
}

/**
 * 出題するカードを選ぶ
 * mode:
 *   'review' 復習期限が来た問題だけ（間違えた問題を優先）
 *   'new'    まだ解いていない問題だけ
 *   'weak'   弱点分野の問題だけ（復習期限の来た問題 → 未学習 → 解いたことのある問題）
 *   'mix'    復習期限の来た問題 → 未学習の問題 の順に埋める（既定）
 * format: 'self'（自己採点）/ 'choice'（4択。選択肢を付ける）
 */
function buildDeck(store, { exam = 'all', session = 'all', group = 'all', mode = 'mix', count = 10, format = 'self' } = {}, now = Date.now()) {
  const progress = progressOf(store);
  const size = Math.min(Math.max(parseInt(count, 10) || 10, 1), MAX_DECK_SIZE);
  let groups = group === 'all' ? null : new Set([group]);
  if (mode === 'weak') {
    const weak = weakGroups(store);
    if (weak.length === 0) return [];
    groups = new Set(weak.map(s => s.id));
  }
  const pool = QUIZ_CARDS.filter(c =>
    (exam === 'all' || c.exam === exam)
    && (session === 'all' || c.session === session)
    && (!groups || groups.has(c.group)));

  // 期限切れの古いものから。間違えた問題（box 0）を先に出す
  const due = pool
    .filter(c => isDue(progress[c.id], now))
    .sort((a, b) => (progress[a.id].box - progress[b.id].box)
      || (new Date(progress[a.id].due) - new Date(progress[b.id].due)));
  const fresh = shuffle(pool.filter(c => !progress[c.id]));

  let deck;
  if (mode === 'review') deck = due;
  else if (mode === 'new') deck = fresh;
  else if (mode === 'weak') {
    // 弱点分野は、まだ復習期限が来ていない問題も正答率の低い順に出して演習量を確保する
    const rest = pool.filter(c => progress[c.id] && !isDue(progress[c.id], now))
      .sort((a, b) => (progress[a.id].box - progress[b.id].box));
    deck = due.concat(fresh, rest);
  } else deck = due.concat(fresh);

  deck = deck.slice(0, size);
  return format === 'choice' ? deck.map(c => ({ ...c, choices: buildChoices(c) })) : deck;
}

// 解答結果を進捗に反映する。存在しないカードIDは無視する
function applyAnswers(store, answers, now = Date.now()) {
  if (!store.quizProgress || typeof store.quizProgress !== 'object') store.quizProgress = {};
  const results = [];
  for (const ans of answers) {
    const card = QUIZ_CARD_MAP.get(ans.id);
    if (!card) continue;
    const correct = ans.correct === true;
    const prev = store.quizProgress[card.id] || { box: 0, correct: 0, wrong: 0 };
    const box = correct ? Math.min(prev.box + 1, MAX_BOX) : 0;
    const days = correct ? BOX_INTERVAL_DAYS[box] : 1;
    store.quizProgress[card.id] = {
      box,
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
      last: new Date(now).toISOString(),
      due: new Date(now + days * DAY_MS).toISOString()
    };
    results.push({ card, correct });
  }
  return results;
}

// 「この問題おかしい？」の報告を追加する（同じ問題の報告は上書き）
function addReport(store, { cardId, reason, note }) {
  const card = QUIZ_CARD_MAP.get(cardId);
  if (!card) return null;
  if (!Array.isArray(store.quizReports)) store.quizReports = [];
  const report = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    cardId,
    reason: REPORT_REASONS.includes(reason) ? reason : 'その他',
    note: typeof note === 'string' ? note.trim().slice(0, 500) : '',
    createdAt: new Date().toISOString()
  };
  store.quizReports = [report, ...store.quizReports.filter(r => r.cardId !== cardId)].slice(0, MAX_REPORTS);
  return report;
}

// 報告に問題の内容を付けて返す（削除された問題の報告は除く）
function listReports(store) {
  if (!Array.isArray(store.quizReports)) return [];
  return store.quizReports
    .filter(r => QUIZ_CARD_MAP.has(r.cardId))
    .map(r => ({ ...r, card: QUIZ_CARD_MAP.get(r.cardId) }));
}

module.exports = {
  quizStats,
  fieldStats,
  weakGroups,
  buildDeck,
  applyAnswers,
  addReport,
  listReports,
  MAX_DECK_SIZE,
  REPORT_REASONS
};
