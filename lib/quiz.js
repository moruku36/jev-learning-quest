// 一問一答の出題と学習進捗（間隔反復）
// 進捗は store.quizProgress = { [cardId]: { box, correct, wrong, last, due } } に保存する。
//   box: 0〜5。正解で1つ上がり、間違えると0に戻る。box に応じて次の出題日を延ばす
const { QUIZ_CARDS, QUIZ_CARD_MAP, QUIZ_EXAMS } = require('./content');

const DAY_MS = 86400000;
// 正解後の box ごとの復習間隔（日）。間違えた問題は翌日にもう一度出す
const BOX_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60];
const MAX_BOX = BOX_INTERVAL_DAYS.length - 1;
const MAX_DECK_SIZE = 30;

function progressOf(store) {
  return store.quizProgress && typeof store.quizProgress === 'object' ? store.quizProgress : {};
}

function isDue(p, now) {
  return Boolean(p && p.due && new Date(p.due).getTime() <= now);
}

// 分野ごとの進捗の集計
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

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 出題するカードを選ぶ
 * mode:
 *   'review' 復習期限が来た問題だけ（間違えた問題を優先）
 *   'new'    まだ解いていない問題だけ
 *   'mix'    復習期限の来た問題 → 未学習の問題 の順に埋める（既定）
 */
function buildDeck(store, { exam = 'all', session = 'all', mode = 'mix', count = 10 } = {}, now = Date.now()) {
  const progress = progressOf(store);
  const size = Math.min(Math.max(parseInt(count, 10) || 10, 1), MAX_DECK_SIZE);
  const pool = QUIZ_CARDS.filter(c =>
    (exam === 'all' || c.exam === exam) && (session === 'all' || c.session === session));

  // 期限切れの古いものから。間違えた問題（box 0）を先に出す
  const due = pool
    .filter(c => isDue(progress[c.id], now))
    .sort((a, b) => (progress[a.id].box - progress[b.id].box)
      || (new Date(progress[a.id].due) - new Date(progress[b.id].due)));
  const fresh = shuffle(pool.filter(c => !progress[c.id]));

  let deck;
  if (mode === 'review') deck = due;
  else if (mode === 'new') deck = fresh;
  else deck = due.concat(fresh);
  return deck.slice(0, size);
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

module.exports = { quizStats, buildDeck, applyAnswers, MAX_DECK_SIZE };
