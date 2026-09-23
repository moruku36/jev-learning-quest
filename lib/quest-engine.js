// Jev 判断エンジンとルールベースのクエスト選定
// APIキーの保存場所（ファイル / 環境変数）には依存せず、呼び出し側から apiKey を受け取る。
const JEV_ENDPOINT = process.env.JEV_API_URL || 'https://api.typesafe.ai/v1/systemone';
const JEV_TIMEOUT_MS = 8000;

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
async function recommendQuestWithJev({ store, category, minutes, goal, apiKey }) {
  const candidates = generateQuestCandidates({ store, category, minutes, goal });
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
  callJevSystemOne,
  generateQuestCandidates,
  selectQuestByRule,
  recommendQuestWithJev,
  evaluateResultWithJev
};
