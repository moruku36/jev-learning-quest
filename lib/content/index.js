// アプリに同梱する学習教材（全ユーザー共通・読み取り専用）
//   - 一問一答: 応用情報 午前 / 支援士 午前II の過去5年分（10回分）の出題テーマから作ったオリジナル問題
//   - AI レポート: AI 大手各社が公開しているレポート・論文の読書リスト
//   - 支援士 午後/科目B: 過去5年分の記述式問題のリスト（IPA 公式 PDF へのリンク）
// Vercel のバンドラーが確実に取り込めるよう、JSON は静的な require で読み込む。
const { AI_READINGS } = require('./ai-readings');
const { FIELD_GROUPS, groupOfField } = require('./fields');
const { SC_WRITTEN } = require('./sc-written');

const QUIZ_SOURCES = [
  require('./quiz/ap_03_haru.json'),
  require('./quiz/ap_03_aki.json'),
  require('./quiz/ap_04_haru.json'),
  require('./quiz/ap_04_aki.json'),
  require('./quiz/ap_05_haru.json'),
  require('./quiz/ap_05_aki.json'),
  require('./quiz/ap_06_haru.json'),
  require('./quiz/ap_06_aki.json'),
  require('./quiz/ap_07_haru.json'),
  require('./quiz/ap_07_aki.json'),
  require('./quiz/sc_03_haru.json'),
  require('./quiz/sc_03_aki.json'),
  require('./quiz/sc_04_haru.json'),
  require('./quiz/sc_04_aki.json'),
  require('./quiz/sc_05_haru.json'),
  require('./quiz/sc_05_aki.json'),
  require('./quiz/sc_06_haru.json'),
  require('./quiz/sc_06_aki.json'),
  require('./quiz/sc_07_haru.json'),
  require('./quiz/sc_07_aki.json')
];

const QUIZ_EXAMS = {
  ap: {
    name: '応用情報 午前',
    shortName: '応用情報',
    description: '支援士の午前I（科目A-1）と同じ範囲。応用情報技術者試験ドットコムの過去問道場に対応',
    site: 'https://www.ap-siken.com/apkakomon.php',
    // 午前問題のページ: https://www.ap-siken.com/kakomon/07_aki/q1.html
    questionUrl: (session, no) => `https://www.ap-siken.com/kakomon/${session}/q${no}.html`
  },
  sc: {
    name: '支援士 午前II',
    shortName: '支援士',
    description: '情報処理安全確保支援士の午前II（科目A-2）。情報処理安全確保支援士試験ドットコムの過去問道場に対応',
    site: 'https://www.sc-siken.com/sckakomon.php',
    questionUrl: (session, no) => `https://www.sc-siken.com/kakomon/${session}/am2_${no}.html`
  }
};

function sessionLabel(session) {
  const [year, term] = session.split('_');
  return `令和${parseInt(year, 10)}年${term === 'haru' ? '春期' : '秋期'}`;
}

// JSON の [番号, テーマ, 問題, 答え, 分野] をカードに展開する
const QUIZ_CARDS = QUIZ_SOURCES.flatMap(src => {
  const exam = QUIZ_EXAMS[src.exam];
  return src.cards.map(([no, topic, question, answer, field]) => ({
    id: `${src.exam}-${src.session}-${no}`,
    exam: src.exam,
    session: src.session,
    sessionLabel: sessionLabel(src.session),
    no,
    topic,
    question,
    answer,
    field,
    group: groupOfField(field),
    sourceLabel: `${exam.name} ${sessionLabel(src.session)} 問${no}`,
    url: exam.questionUrl(src.session, no)
  }));
});

const QUIZ_CARD_MAP = new Map(QUIZ_CARDS.map(c => [c.id, c]));

// 新しい試験回が先に来るように並べる（同じ年は秋期 → 春期）
const sessionOrder = session => parseInt(session, 10) * 2 + (session.endsWith('_aki') ? 1 : 0);
const QUIZ_SESSIONS = [...new Set(QUIZ_SOURCES.map(s => s.session))]
  .sort((a, b) => sessionOrder(b) - sessionOrder(a))
  .map(session => ({ session, label: sessionLabel(session) }));

const AI_READING_MAP = new Map(AI_READINGS.map(r => [r.id, r]));
const SC_WRITTEN_MAP = new Map(SC_WRITTEN.map(w => [w.id, w]));

module.exports = {
  QUIZ_EXAMS,
  QUIZ_CARDS,
  QUIZ_CARD_MAP,
  QUIZ_SESSIONS,
  FIELD_GROUPS,
  AI_READINGS,
  AI_READING_MAP,
  SC_WRITTEN,
  SC_WRITTEN_MAP
};
