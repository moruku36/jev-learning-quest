// Jev 判断エンジンとルールベースのクエスト選定
// APIキーの保存場所（ファイル / 環境変数）には依存せず、呼び出し側から apiKey を受け取る。
const JEV_ENDPOINT = process.env.JEV_API_URL || 'https://api.typesafe.ai/v1/systemone';
const JEV_TIMEOUT_MS = 8000;

const { QUIZ_EXAMS, AWS_COURSES, SC_WRITTEN } = require('./content');
const { isArchivedCategory } = require('./categories');
const { NW_QUESTIONS, NW_QUESTION_MAP, nwQuest } = require('./content/nw-exams');
const { quizStats, weakGroups, MAX_DECK_SIZE } = require('./quiz');

// Jev の Choice に渡す候補の上限
const MAX_CHOICE_CANDIDATES = 8;
// 一度に提案する支援士 午後/科目B の過去問の数
const MAX_WRITTEN_CANDIDATES = 2;

// 使える時間から一問一答の出題数を決める（1問あたり約1分）
function quizDeckSize(minutes) {
  return Math.min(Math.max(minutes, 5), MAX_DECK_SIZE);
}

function writtenItemId(written) {
  return `written:${written.id}`;
}

// 同梱の午後/科目B 過去問の演習手順（問題本文は IPA の PDF で読む）
function writtenQuestionText(w) {
  return `IPA の問題冊子（PDF）を開き、${w.title.replace(/「.*」$/, '')}を解いてください。\n` +
    `目安: ${w.minutes}分（本試験は${w.note}）\n\n` +
    '答案は設問ごとに「設問1(1): …」の形で書きます。解き終わったら解答例と照らし合わせて自己採点してください。';
}

// --- Jev API クライアント (文章生成を行わず判断のみ利用) ---
async function callJevSystemOne({ state, questions, apiKey }) {
  const key = (apiKey || '').trim();
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
function generateQuestCandidates({ store, category, minutes, goal, awsCourse = 'all' }) {
  const candidates = [];
  const now = new Date();

  // 1. 再挑戦待ち (誤答かつ復習期限到来または弱点)
  const pendingReviews = store.history.filter(h => {
    // 一問一答の記録はカード単位の復習で扱うので、ここでは再挑戦にしない
    if (h.isCorrect || h.resolved || h.kind === 'quiz') return false;
    if (isArchivedCategory(h.category)) return false; // 旧分野の履歴はデータに残すが、再挑戦には出さない
    if (category !== 'all' && h.category !== category) return false;
    if (!h.nextReviewDate) return true;
    return new Date(h.nextReviewDate) <= now;
  });

  pendingReviews.forEach(h => {
    const item = store.items.find(i => i.id === h.itemId);
    const written = SC_WRITTEN.find(w => writtenItemId(w) === h.itemId);
    const network = NW_QUESTION_MAP.get(h.itemId);
    // A due full exam still needs its full time budget.
    if (network && network.minutes > minutes) return;
    const networkQuest = network ? nwQuest(network) : {};
    candidates.push({
      ...networkQuest,
      id: `review_${h.id}`,
      type: '誤答を直す',
      category: h.category,
      title: `【再挑戦】${h.title || (item ? item.title : '過去問演習')}の弱点克服`,
      sourceRef: network ? network.sourceLabel : item ? item.source : (written ? 'IPA 過去問題' : '前回答案記録'),
      questionText: network ? networkQuest.questionText : (item ? item.questionText : (written ? writtenQuestionText(written) : h.questionText || '')),
      keywords: item ? item.keywords : h.keywords,
      answerUrl: network ? network.answerPdf : written ? written.answerPdf : undefined,
      url: network ? network.questionPdf : (written ? written.questionPdf : (item && item.url) || undefined),
      previousMistake: `${h.mistakeReason || '誤答'}: ${h.mistakeDetail || ''}`,
      recommendedMinutes: network ? network.minutes : Math.min(minutes, 20),
      reason: `前回の誤答原因「${h.mistakeReason || '知識不足'}」を克服するため、解説を見ずに再挑戦します。`,
      criteria: '前回の誤答箇所を修正し、設問要求を満たす正確な記述または解答ができること。',
      itemId: h.itemId,
      historyId: h.id
    });
  });

  if (category === 'all' || category === 'nw') {
    const attempted = new Set(store.history.map(h => h.itemId));
    const available = NW_QUESTIONS.filter(q => !attempted.has(q.itemId));
    // Include a short morning exercise and a full written exercise distinctly.
    const kinds = goal === 'exercise' && minutes >= 45 ? ['written', 'choice'] : ['choice', 'written'];
    for (const kind of kinds) {
      const q = available.find(q => q.kind === kind && q.minutes <= minutes)
        || (category === 'nw' ? NW_QUESTIONS.find(q=>q.kind === kind && q.minutes <= minutes) : null);
      if (q) candidates.push(nwQuest(q));
    }
  }

  // 2. 一問一答（支援士 午前II / 応用情報 午前）
  const quizCandidates = [];
  if (category === 'all' || category === 'sc') {
    const stats = quizStats(store, now.getTime());
    const size = quizDeckSize(minutes);
    if (stats.all.due > 0) {
      const n = Math.min(stats.all.due, size);
      quizCandidates.push({
        id: 'quiz_review',
        type: '一問一答',
        category: 'sc',
        title: `【復習】一問一答: 復習期限が来た${n}問${stats.all.wrongDue ? `（前回間違えた問題を優先）` : ''}`,
        sourceRef: '応用情報 午前 / 支援士 午前II 過去5年分',
        recommendedMinutes: Math.min(minutes, Math.max(5, n)),
        reason: '間違えた問題と、覚えた問題を忘れかける頃に出し直して記憶を定着させます。',
        criteria: '答えを見る前に自分の答えを言えること。⭕が続くと出題の間隔が延びていきます。',
        quiz: { exam: 'all', mode: 'review', count: n },
        isReview: true
      });
    }
    // 正答率の低い分野（弱点分野）を集中して出題する
    const weak = weakGroups(store);
    if (weak.length > 0) {
      const names = weak.map(w => `${w.name} ${Math.round(w.accuracy * 100)}%`).join('、');
      quizCandidates.push({
        id: 'quiz_weak',
        type: '一問一答',
        category: 'sc',
        title: `一問一答: 弱点分野を集中演習（${size}問）`,
        sourceRef: `正答率の低い分野: ${names}`,
        recommendedMinutes: size,
        reason: `一問一答の正答率が低い分野（${names}）を重点的に解いて、弱点を埋めます。`,
        criteria: '弱点分野の正答率を上げること。間違えた問題は翌日にもう一度出題されます。',
        quiz: { exam: 'all', mode: 'weak', count: size },
        isWeak: true
      });
    }
    for (const exam of ['sc', 'ap']) {
      const info = QUIZ_EXAMS[exam];
      const s = stats[exam];
      if (s.studied >= s.total) continue;
      quizCandidates.push({
        id: `quiz_${exam}`,
        type: '一問一答',
        category: 'sc',
        title: `一問一答: ${info.name}（過去5年分から${size}問）`,
        sourceRef: `${info.name} 令和3年春期〜令和7年秋期（学習済み ${s.studied} / ${s.total}問）`,
        recommendedMinutes: size,
        reason: exam === 'sc'
          ? '支援士の午前II（科目A-2）の頻出テーマを、1問1分のテンポで確認します。'
          : '支援士の午前I（科目A-1）と同じ範囲の応用情報 午前から、幅広い知識をテンポよく確認します。',
        criteria: '答えを見る前に自分の答えを思い浮かべ、⭕/❌を正直に付けること。',
        quiz: { exam, mode: 'mix', count: size }
      });
    }
  }

  // 3. 登録済み過去問 (未着手または演習)
  const pastPapers = store.items.filter(i => {
    if (i.type !== 'sc_past_paper') return false;
    if (isArchivedCategory(i.category)) return false;
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
      keywords: item.keywords || '',
      url: item.url || undefined,
      recommendedMinutes: Math.max(20, Math.min(minutes, 30)),
      reason: '支援士科目Bの記述力と設問読解力を高めるため、解説を見ずに時間を計って答案を作成します。',
      criteria: '制限時間内に自分の答案を完成させ、設問要求との合致度を自己評価できること。',
      itemId: item.id
    });
  });

  // 3-b. 同梱の支援士 午後/科目B 過去問（まだ解いていないものを新しい回から）
  if (category === 'all' || category === 'sc') {
    const attempted = new Set(store.history.filter(h => h.itemId).map(h => h.itemId));
    SC_WRITTEN.filter(w => !attempted.has(writtenItemId(w)))
      .slice(0, MAX_WRITTEN_CANDIDATES)
      .forEach(w => {
        candidates.push({
          id: `written_${w.id}`,
          type: '過去問を解く',
          category: 'sc',
          title: `過去問記述演習: 支援士 ${w.title}`,
          sourceRef: 'IPA 過去問題（問題冊子・解答例は IPA 公式サイトの PDF）',
          questionText: writtenQuestionText(w),
          url: w.questionPdf,
          answerUrl: w.answerPdf,
          recommendedMinutes: w.minutes,
          reason: '支援士の午後/科目Bの本番の問題で、記述力と設問の読解力を鍛えます。登録の手間なくすぐ始められます。',
          criteria: '時間内に全設問の答案を書き、解答例のキーワードと照らし合わせて自己採点すること。',
          itemId: writtenItemId(w)
        });
      });
  }

  // 4. キャッチアップ情報 (次の行動付き)
  const catchups = store.items.filter(i => {
    if (i.type === 'sc_past_paper') return false;
    if (isArchivedCategory(i.category)) return false; // 旧分野（AI・クラウド・セキュリティ）の教材は出さない
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

  // 5. AWS の一問一答（コース: 基礎 / SAA / SAP）。「すべて」では復習期限が来た問題だけを提案する
  const awsCandidates = [];
  if (category === 'all' || category === 'aws') {
    const stats = quizStats(store, now.getTime());
    const size = quizDeckSize(minutes);
    const courses = AWS_COURSES.filter(c => awsCourse === 'all' || c.id === awsCourse);
    const examParam = courses.length === 1 ? courses[0].exam : 'aws';
    const scope = courses.length === 1 ? `${courses[0].examCode} ${courses[0].level}` : 'AWS 全コース';
    const sums = courses.reduce((acc, c) => {
      for (const k of Object.keys(acc)) acc[k] += stats[c.exam][k];
      return acc;
    }, { total: 0, studied: 0, mastered: 0, due: 0, wrongDue: 0 });
    if (courses.length > 0 && sums.due > 0) {
      const n = Math.min(sums.due, size);
      awsCandidates.push({
        id: 'aws_review',
        type: '一問一答',
        category: 'aws',
        title: `【復習】AWS一問一答（${scope}）: 復習期限が来た${n}問${sums.wrongDue ? '（前回覚えていない問題を優先）' : ''}`,
        sourceRef: `AWS ${scope}（コース別の進捗は復習・試験問題タブ）`,
        recommendedMinutes: Math.min(minutes, Math.max(5, n)),
        reason: '覚えていなかった問題と、忘れかける頃の問題を出し直して記憶を定着させます。',
        criteria: '答えを見る前に自分の答えを思い出し、「覚えていた／覚えていない」を正直に選ぶこと。',
        quiz: { exam: examParam, mode: 'review', count: n },
        isReview: true
      });
    }
    if (category === 'aws') {
      const weak = weakGroups(store, examParam);
      if (weak.length > 0) {
        const names = weak.map(w => `${w.name} ${Math.round(w.accuracy * 100)}%`).join('、');
        awsCandidates.push({
          id: 'aws_weak',
          type: '一問一答',
          category: 'aws',
          title: `AWS一問一答: 弱点の領域を集中演習（${scope}・${size}問）`,
          sourceRef: `覚えていた割合が低い領域: ${names}`,
          recommendedMinutes: size,
          reason: `覚えていた割合が低い領域（${names}）を重点的に確認します。`,
          criteria: '弱点の領域で、答えを思い出せる問題を増やすこと。',
          quiz: { exam: examParam, mode: 'weak', count: size },
          isWeak: true
        });
      }
      for (const course of courses) {
        const s = stats[course.exam];
        if (s.studied >= s.total) continue;
        awsCandidates.push({
          id: `aws_${course.id}`,
          type: '一問一答',
          category: 'aws',
          title: `AWS一問一答: ${course.examCode} ${course.level}（${size}問）`,
          sourceRef: `${course.name}（${course.examCode}）学習済み ${s.studied} / ${s.total}問・AWS公式資料を根拠にしたオリジナル問題`,
          recommendedMinutes: size,
          reason: course.id === 'clf'
            ? 'AWSの基礎（クラウドの概念・セキュリティ・主要サービス・料金）を、1問1分のテンポで確認します。'
            : `${course.examCode} の出題領域に沿って、サービスの使い分けと基本的な設計を思い出して確認します。本番試験の形式ではありません。`,
          criteria: '答えを見る前に自分の答えを思い出し、「覚えていた／覚えていない」を正直に選ぶこと。',
          quiz: { exam: course.exam, mode: 'mix', count: size }
        });
      }
    }
  }

  // Jev に渡す上位の候補に各種類が入るよう、再挑戦 → 一問一答（IPA）→ AWS → 登録素材 の順に並べる
  const registered = candidates.splice(pendingReviews.length);
  candidates.push(...quizCandidates, ...awsCandidates, ...registered);

  // 候補が空の場合の汎用テンプレート候補
  if (candidates.length === 0) {
    candidates.push({
      id: 'default_past_01',
      type: '過去問を解く',
      category: category === 'nw' ? 'nw' : 'sc',
      title: '情報処理安全確保支援士 科目B 設問分析と答案作成',
      sourceRef: 'IPA公式サイトの最新過去問',
      recommendedMinutes: minutes,
      reason: '集中して1問の答案作成を行い、キーワードと設問の要求事項の整合性を鍛えるため。',
      criteria: '解説を見ずに答案を書き上げ、所要時間と誤答原因を記録すること。'
    });
  }

  return candidates;
}

// ルールベースによる最適なクエスト選択
function selectQuestByRule(candidates, { minutes, goal, category }) {
  const findExercise = () => candidates.find(c => c.type === '過去問を解く');
  const findInput = () => candidates.find(c => c.type === '短く説明する' || c.type === '更新を読む' || c.type === '実務への影響を整理する');
  const findQuiz = () => candidates.find(c => c.type === '一問一答' && !c.isReview);

  // 1. 気分で明示された目的を優先する
  if (goal === 'exercise' && findExercise()) {
    return { selected: findExercise(), reasonDetail: '「じっくり演習」が選ばれたため、過去問の答案作成を提案しました。' };
  }
  if (goal === 'exercise' && findQuiz()) {
    return { selected: findQuiz(), reasonDetail: '「じっくり演習」が選ばれたため、過去問の一問一答を提案しました。' };
  }
  if (goal === 'input' && findInput()) {
    return { selected: findInput(), reasonDetail: '「サクッと確認」が選ばれたため、短時間で終わる登録済みの教材を提案しました。' };
  }
  if (goal === 'input' && findQuiz()) {
    return { selected: findQuiz(), reasonDetail: '「サクッと確認」が選ばれたため、1問ずつ確認できる一問一答を提案しました。' };
  }

  // 2. 再挑戦待ちがあれば最優先（おまかせ / 弱点をつぶす）
  const reviewCand = candidates.find(c => c.type === '誤答を直す') || candidates.find(c => c.isReview);
  if (reviewCand) {
    const reasonDetail = reviewCand.isReview
      ? '一問一答で復習期限が来た問題があるため、最優先で提案しました。'
      : '復習期限が来た誤答があるため、最優先で提案しました。';
    return { selected: reviewCand, reasonDetail };
  }

  // 2-b. 弱点分野があれば集中演習（弱点をつぶす / 支援士のおまかせ）
  const weakQuiz = candidates.find(c => c.isWeak);
  if (weakQuiz && (goal === 'weakness' || (goal === 'balance' && (category === 'sc' || category === 'aws')))) {
    return { selected: weakQuiz, reasonDetail: '一問一答の正答率が低い分野があるため、弱点分野の集中演習を提案しました。' };
  }

  // 3. 時間が十分にある（30分以上）なら演習
  if (minutes >= 30 && findExercise()) {
    return { selected: findExercise(), reasonDetail: `使える時間（${minutes}分）を活かして答案作成を進めるため提案しました。` };
  }

  // 4. 短時間（10〜20分）なら、支援士は一問一答、それ以外はキャッチアップ
  if (minutes <= 20 && (category === 'sc' || category === 'aws') && findQuiz()) {
    return { selected: findQuiz(), reasonDetail: `短時間（${minutes}分）でも進められる一問一答を提案しました。` };
  }
  if (minutes <= 20 && findInput()) {
    return { selected: findInput(), reasonDetail: `短時間（${minutes}分）で終わるキャッチアップとして提案しました。` };
  }
  if (findQuiz()) {
    return { selected: findQuiz(), reasonDetail: '過去問の知識を広く確認できる一問一答を提案しました。' };
  }

  return { selected: candidates[0], reasonDetail: '現在の学習状況と条件に最も合うクエストを提案しました。' };
}

function selectionContext({ selected, store, minutes, goal, category }) {
  const parts = [`使える時間 ${minutes}分`];
  const goalLabel = {
    balance: 'おまかせ', weakness: '弱点をつぶす', exercise: 'じっくり演習', input: 'サクッと確認'
  }[goal] || 'おまかせ';
  parts.push(`目的「${goalLabel}」`);
  if (category !== 'all') {
    const categoryLabel = { nw: 'ネットワーク', sc: '支援士', aws: 'AWS' }[category];
    if (categoryLabel) parts.push(`分野「${categoryLabel}」`);
  }

  if (selected.type === '誤答を直す') {
    const pending = store.history.filter(h => !h.isCorrect && !h.resolved && h.kind !== 'quiz' && !isArchivedCategory(h.category));
    if (pending.length) parts.push(`再挑戦待ちの誤答 ${pending.length}件`);
  } else if (selected.isReview) {
    const stats = quizStats(store);
    const due = selected.category === 'aws' ? stats.aws.due : stats.all.due;
    if (due) parts.push(`復習期限の来た一問一答 ${due}問`);
  }

  if (selected.isWeak) {
    const groups = weakGroups(store, selected.quiz && selected.quiz.exam || 'all').slice(0, 3);
    if (groups.length) parts.push(`弱点分野 ${groups.map(g => `${g.name} ${Math.round(g.accuracy * 100)}%`).join('、')}`);
  }
  return `選定に使った条件: ${parts.join('・')}。`;
}

// Jevによるクエスト推薦 (Choice primitive を利用)
async function recommendQuestWithJev({ store, category, minutes, goal, apiKey, awsCourse = 'all' }) {
  const candidates = generateQuestCandidates({ store, category, minutes, goal, awsCourse });
  const apiKeyConfigured = Boolean(apiKey);

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
  candidates.slice(0, MAX_CHOICE_CANDIDATES).forEach(c => {
    choiceCriteria[c.id] = `[${c.type}][${c.category}] ${c.title} (所要:${c.recommendedMinutes}分) - 狙い: ${c.reason}`;
  });

  const goalLabel = {
    balance: 'おまかせ（弱点があれば克服を優先）',
    weakness: '弱点をつぶしたい（誤答の再挑戦を最優先）',
    exercise: 'じっくり演習したい（過去問の答案作成・一問一答を優先）',
    input: 'サクッと確認したい（短時間で終わる教材・一問一答を優先）'
  }[goal] || 'おまかせ';

  const examScope = category === 'aws' ? 'aws' : 'all';
  const quiz = quizStats(store)[examScope];
  const weak = weakGroups(store, examScope);
  const weakText = weak.length
    ? weak.map(w => `${w.name}（正答率${Math.round(w.accuracy * 100)}%）`).join('、')
    : 'なし（またはまだ判定できるほど解いていない）';
  const statePrompt = `ユーザーの学習状態:
- 選択分野: ${category}
- 利用可能時間: ${minutes}分
- 今日の気分・目的: ${goalLabel}
- 登録学習項目数: ${store.items.length}件
- 過去の演習履歴数: ${store.history.length}件
- 未克服の誤答数: ${store.history.filter(h => !h.isCorrect && !h.resolved && h.kind !== 'quiz' && !isArchivedCategory(h.category)).length}件
- 一問一答: 学習済み ${quiz.studied} / ${quiz.total}問、復習期限が来た問題 ${quiz.due}問
- 一問一答の弱点分野: ${weakText}`;

  const jevRes = await callJevSystemOne({
    apiKey,
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
      decisionNote: `Jev が候補から選びました。${selectionContext({ selected, store, minutes, goal, category })}`,
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
async function evaluateResultWithJev({ resultData, apiKey }) {
  const apiKeyConfigured = Boolean(apiKey);

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
    apiKey,
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

module.exports = {
  JEV_TIMEOUT_MS,
  writtenItemId,
  callJevSystemOne,
  generateQuestCandidates,
  selectQuestByRule,
  recommendQuestWithJev,
  evaluateResultWithJev
};
