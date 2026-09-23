// Jev 学習クエスト - フロントエンド

const STATE = {
  activeTab: 'quest',
  currentQuest: null,
  allCandidates: [],
  jev: { jevConfigured: false, keySource: 'none', maskedKey: '' },
  conditions: {
    minutes: 20,
    category: 'all',
    goal: 'balance'
  },
  timer: {
    intervalId: null,
    totalSeconds: 20 * 60,
    remainingSeconds: 20 * 60,
    isRunning: false
  },
  isCorrect: true,
  mistakeReason: '読み落とし',
  // 一問一答の実行状態
  quiz: null,
  library: null,
  readingFilter: 'todo'
};

const CATEGORY_NAMES = {
  sc: '支援士',
  ai: 'AI',
  cloud: 'クラウド',
  security: 'セキュリティ'
};

const SCORE_LABELS = ['-', '基礎から見直し', '要復習', '概ね理解', 'しっかり理解'];

const DECISION_LABELS = {
  jev: { text: '🧠 Jev が選定', cls: 'jev' },
  rule: { text: '📋 ルールで選定', cls: 'rule' },
  rule_fallback: { text: '⚠️ Jev 接続失敗 → ルールで選定', cls: 'warn' },
  manual: { text: '👆 自分で選択', cls: 'rule' }
};

const SETUP_DISMISS_KEY = 'jlq.setupDismissed';

// クラウド版のログイン (Supabase Auth)。バージョン固定 + SRI で改ざんされたスクリプトを読み込まない
const SUPABASE_JS = {
  src: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.0/dist/umd/supabase.js',
  integrity: 'sha384-xPW3QHswsICVC2mW6BFNwMbhpLkbZ133fKOhxNx3QGGgAOJfL3O9t8r2aWn1aez6'
};

const AUTH = {
  mode: 'local',
  client: null,
  session: null
};

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initFilterPills();
  initHeroActions();
  initRunMode();
  initRegisterForms();
  initSettings();
  initAuthButtons();
  initQuiz();
  initLibrary();
  initOffline();
  registerServiceWorker();

  const ready = await initAuth();
  if (ready) await startApp();
});

async function startApp() {
  setHidden('authScreen', true);
  setHidden('appShell', false);
  STATE.offline = false;
  updateOfflineUi();
  await checkJevStatus();
  await loadRecommendedQuest();
  await updateReviewBadge();
  // オフラインで解いた結果を送り、次のオフラインに備えて問題を取っておく
  await flushPendingQuizResults();
  refreshOfflineDeck();
}

// --- 認証 (クラウド版のみ) ---
function loadScript({ src, integrity }) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.integrity = integrity;
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';
    script.onload = resolve;
    script.onerror = () => reject(new Error('ログイン用スクリプトを読み込めませんでした'));
    document.head.appendChild(script);
  });
}

function showAuthScreen(message, { canSwitchAccount = false } = {}) {
  setHidden('appShell', true);
  setHidden('authScreen', false);
  const msg = document.getElementById('authMessage');
  msg.textContent = message || '';
  msg.hidden = !message;
  setHidden('btnLogin', canSwitchAccount);
  setHidden('btnAuthLogout', !canSwitchAccount);
}

async function initAuth() {
  let config;
  try {
    const res = await fetch('/api/config');
    config = await res.json();
  } catch (e) {
    // 通信できないときは、保存しておいた一問一答だけ使えるオフラインモードにする
    if (loadOfflineDeck().length > 0) {
      enterOfflineMode();
      return false;
    }
    showAuthScreen('サーバーに接続できませんでした。時間をおいて再度お試しください。');
    return false;
  }

  AUTH.mode = config.mode || 'local';
  if (AUTH.mode !== 'cloud') return true;

  if (config.configError || !config.supabaseUrl || !config.supabaseAnonKey) {
    showAuthScreen(`サーバーの設定が完了していません。${config.configError || ''}`);
    setHidden('btnLogin', true);
    return false;
  }

  try {
    await loadScript(SUPABASE_JS);
  } catch (e) {
    showAuthScreen(e.message);
    return false;
  }

  AUTH.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  AUTH.client.auth.onAuthStateChange((_event, session) => {
    AUTH.session = session;
  });

  const { data } = await AUTH.client.auth.getSession();
  AUTH.session = data.session;
  // OAuth から戻ってきた直後の ?code= を URL から消す
  if (window.location.search.includes('code=')) {
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (!AUTH.session) {
    showAuthScreen('');
    return false;
  }

  // 許可リストの確認を兼ねて状態を取得
  const status = await api('/api/status');
  if (status.success === false) return false;
  document.getElementById('userEmail').textContent = status.user ? status.user.email : '';
  setHidden('userMenu', false);
  return true;
}

function initAuthButtons() {
  document.getElementById('btnLogin').addEventListener('click', async () => {
    if (!AUTH.client) return;
    const { error } = await AUTH.client.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + '/' }
    });
    if (error) showAuthScreen(`ログインを開始できませんでした: ${error.message}`);
  });

  const logout = async () => {
    if (AUTH.client) await AUTH.client.auth.signOut();
    AUTH.session = null;
    setHidden('userMenu', true);
    showAuthScreen('ログアウトしました。');
  };
  document.getElementById('btnLogout').addEventListener('click', logout);
  document.getElementById('btnAuthLogout').addEventListener('click', logout);
}

async function authHeaders() {
  if (AUTH.mode !== 'cloud' || !AUTH.client) return {};
  // 期限切れ間近なら supabase-js が自動で更新したトークンを返す
  const { data } = await AUTH.client.auth.getSession();
  AUTH.session = data.session;
  return AUTH.session ? { Authorization: `Bearer ${AUTH.session.access_token}` } : {};
}

// --- 共通ユーティリティ ---
async function api(path, options = {}) {
  const init = { ...options, headers: { ...(await authHeaders()), ...(options.headers || {}) } };
  if (options.body !== undefined) {
    init.method = options.method || 'POST';
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok && data.success === undefined) {
    data.success = false;
  }
  if (AUTH.mode === 'cloud' && res.status === 401) {
    showAuthScreen(data.error || 'もう一度ログインしてください。');
  } else if (AUTH.mode === 'cloud' && res.status === 403) {
    showAuthScreen(data.error || 'このアカウントは利用を許可されていません。', { canSwitchAccount: true });
  }
  return data;
}

async function downloadBackup() {
  const res = await fetch('/api/backup', { headers: await authHeaders() });
  if (!res.ok) {
    showToast('バックアップを取得できませんでした', 'error');
    return;
  }
  const blob = await res.blob();
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = match ? match[1] : 'jev_learning_quest_backup.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('hide'), 3200);
  setTimeout(() => toast.remove(), 3600);
}

function setHidden(id, hidden) {
  document.getElementById(id).hidden = hidden;
}

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* 保存できなくても動作に影響なし */ }
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function categoryName(cat) {
  return CATEGORY_NAMES[cat] || (cat ? String(cat).toUpperCase() : '-');
}

// --- 1. タブナビゲーション ---
function initTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab')));
  });
  document.getElementById('jevChip').addEventListener('click', () => switchTab('settings'));
}

function switchTab(tabName) {
  STATE.activeTab = tabName;
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.view-panel').forEach(p => {
    p.classList.toggle('active', p.id === `view-${tabName}`);
  });

  if (tabName === 'review') {
    loadReviewList();
  } else if (tabName === 'library') {
    loadLibrary();
  } else if (tabName === 'register') {
    loadItemList();
  } else if (tabName === 'settings') {
    checkJevStatus();
  } else if (tabName === 'quest') {
    updateReviewBadge();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 2. 条件選択 (時間 / 分野 / 気分) ---
function initFilterPills() {
  setupPills('timePills', val => {
    STATE.conditions.minutes = parseInt(val, 10);
    loadRecommendedQuest();
  });
  setupPills('catPills', val => {
    STATE.conditions.category = val;
    loadRecommendedQuest();
  });
  setupPills('goalPills', val => {
    STATE.conditions.goal = val;
    loadRecommendedQuest();
  });
}

function setupPills(containerId, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const pills = container.querySelectorAll('.pill');
  pills.forEach(p => {
    p.addEventListener('click', () => {
      pills.forEach(item => item.classList.remove('active'));
      p.classList.add('active');
      onChange(p.getAttribute('data-val'));
    });
  });
}

function selectPill(containerId, value) {
  document.querySelectorAll(`#${containerId} .pill`).forEach(p => {
    p.classList.toggle('active', p.getAttribute('data-val') === value);
  });
}

// --- 3. クエスト推薦と表示 ---
async function loadRecommendedQuest() {
  const titleEl = document.getElementById('heroTitle');
  const heroCard = document.getElementById('questHeroCard');
  titleEl.textContent = STATE.jev.jevConfigured ? 'Jev が今日のクエストを選んでいます...' : '今日のクエストを選んでいます...';
  heroCard.classList.add('loading');

  try {
    const data = await api('/api/quest/recommend', { body: STATE.conditions });
    if (!data.quest) {
      titleEl.textContent = '候補が見つかりませんでした。「素材を登録」から問題や記事を追加してください。';
      return;
    }
    STATE.currentQuest = { ...data.quest, decisionSource: data.decisionSource };
    STATE.allCandidates = data.allCandidates || [];
    renderHeroQuest(STATE.currentQuest, data.decisionSource, data.decisionNote);
  } catch (err) {
    titleEl.textContent = 'クエストの取得に失敗しました。サーバーが起動しているか確認してください。';
  } finally {
    heroCard.classList.remove('loading');
  }
}

function renderHeroQuest(quest, decisionSource, decisionNote) {
  document.getElementById('heroTitle').textContent = quest.title;
  document.getElementById('heroCategory').textContent = categoryName(quest.category);
  document.getElementById('heroType').textContent = quest.type;
  document.getElementById('heroTime').textContent = `⏱ ${quest.recommendedMinutes || STATE.conditions.minutes}分`;
  document.getElementById('heroSource').textContent = quest.sourceRef ? `出典: ${quest.sourceRef}` : '';
  document.getElementById('heroReason').textContent = quest.reason;
  document.getElementById('heroCriteria').textContent = quest.criteria;
  document.getElementById('heroDecisionNote').textContent = decisionNote || '';

  const label = DECISION_LABELS[decisionSource] || DECISION_LABELS.rule;
  const sourceTag = document.getElementById('heroDecisionSource');
  sourceTag.className = `tag tag-source ${label.cls}`;
  sourceTag.textContent = label.text;

  setHidden('questHeroCard', false);
  setHidden('questRunCard', true);
  setHidden('completionBanner', true);
}

// --- 4. クエスト実行 ---
function initHeroActions() {
  document.getElementById('btnStartHero').addEventListener('click', () => {
    if (STATE.currentQuest) startQuestRun(STATE.currentQuest);
  });

  document.getElementById('btnChangeQuest').addEventListener('click', openCandidatesModal);
  document.getElementById('btnCloseQuestList').addEventListener('click', closeCandidatesModal);
  document.getElementById('questListModal').addEventListener('click', e => {
    if (e.target.id === 'questListModal') closeCandidatesModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCandidatesModal();
  });

  document.getElementById('btnCompNext').addEventListener('click', loadRecommendedQuest);

  document.getElementById('btnSetupKey').addEventListener('click', () => {
    switchTab('settings');
    document.getElementById('txtJevKey').focus();
  });
  document.getElementById('btnDismissSetup').addEventListener('click', () => {
    storageSet(SETUP_DISMISS_KEY, '1');
    setHidden('setupBanner', true);
  });
}

function openCandidatesModal() {
  const container = document.getElementById('questListBody');
  container.innerHTML = '';

  if (STATE.allCandidates.length === 0) {
    container.innerHTML = '<p class="text-muted">ほかの候補がありません</p>';
  } else {
    STATE.allCandidates.forEach(cand => {
      const isCurrent = STATE.currentQuest && STATE.currentQuest.id === cand.id;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `modal-item${isCurrent ? ' current' : ''}`;
      item.innerHTML = `
        <div class="modal-item-tags">
          <span class="tag tag-cat">${escapeHtml(categoryName(cand.category))}</span>
          <span class="tag tag-type">${escapeHtml(cand.type)}</span>
          <span class="tag tag-time">${cand.recommendedMinutes || 20}分</span>
          ${isCurrent ? '<span class="tag tag-source jev">表示中</span>' : ''}
        </div>
        <h4>${escapeHtml(cand.title)}</h4>
        <p>${escapeHtml(cand.reason)}</p>
      `;
      item.addEventListener('click', () => {
        STATE.currentQuest = { ...cand, decisionSource: 'manual' };
        renderHeroQuest(STATE.currentQuest, 'manual', 'あなたが候補から選んだクエストです。');
        closeCandidatesModal();
      });
      container.appendChild(item);
    });
  }

  setHidden('questListModal', false);
}

function closeCandidatesModal() {
  setHidden('questListModal', true);
}

function startQuestRun(quest) {
  if (quest.type === '一問一答') {
    startQuizRun(quest);
    return;
  }
  STATE.currentQuest = quest;
  setHidden('questHeroCard', true);
  setHidden('completionBanner', true);
  setHidden('questRunCard', false);

  document.getElementById('runTitle').textContent = quest.title;
  document.getElementById('runCatTag').textContent = categoryName(quest.category);
  document.getElementById('runTypeTag').textContent = quest.type;
  const minutes = quest.recommendedMinutes || STATE.conditions.minutes || 20;

  const promptBox = document.getElementById('runPrompt');
  const link = document.getElementById('runLink');
  link.hidden = !quest.url;
  if (quest.url) link.href = quest.url;

  if (quest.type === 'レポートを読む' || (quest.type === '誤答を直す' && quest.focus)) {
    let text = `【読むもの】\n${quest.title.replace(/^【再挑戦】/, '')}\n\n【読むときの観点】\n${quest.focus || '-'}\n\n【アウトプット】\n${quest.task || quest.criteria || '要点を3行でまとめる'}`;
    if (quest.previousMistake) text = `【前回つまずいた点】\n${quest.previousMistake}\n\n${text}`;
    promptBox.textContent = text;
  } else if (quest.type === '過去問を解く' || quest.type === '誤答を直す') {
    let text = quest.questionText || '過去問の設問に沿って、解説を見ずに答案を作成してください。';
    if (quest.previousMistake) {
      text = `【前回つまずいた点】\n${quest.previousMistake}\n\n【設問】\n${text}`;
    }
    promptBox.textContent = text;
  } else {
    promptBox.textContent = `【やること】\n${quest.nextAction || '実務への影響を整理する'}\n\n【対象】\n${quest.title}\n\n【要点メモ】\n${quest.notes || '公式資料を確認し、実務での活用と次の行動をまとめてください。'}`;
  }

  // 記述式（過去問）はキーワード照合・設問の貼り付け欄を出す
  const isWritten = quest.type === '過去問を解く' || (quest.type === '誤答を直す' && !quest.focus);
  setHidden('writtenExtra', !isWritten);
  document.getElementById('inputKeywords').value = quest.keywords || '';
  document.getElementById('inputQuestionText').value = '';
  const answerLink = document.getElementById('runAnswerLink');
  answerLink.hidden = !quest.answerUrl;
  if (quest.answerUrl) answerLink.href = quest.answerUrl;

  const answer = document.getElementById('inputAnswer');
  answer.value = '';
  updateCharCount();
  document.getElementById('inputMistakeDetail').value = '';
  selectPill('evalPills', 'true');
  setEvalState(true);

  startTimer(minutes);
  document.getElementById('questRunCard').scrollIntoView({ behavior: 'smooth' });
  answer.focus({ preventScroll: true });
}

function initRunMode() {
  document.getElementById('btnTimerPlayPause').addEventListener('click', toggleTimer);

  document.getElementById('btnCancelRun').addEventListener('click', () => {
    const hasInput = document.getElementById('inputAnswer').value.trim() !== '';
    if (hasInput && !confirm('入力した答案は保存されません。中断しますか？')) return;
    stopTimer();
    setHidden('questRunCard', true);
    setHidden('questHeroCard', false);
  });

  setupPills('evalPills', val => setEvalState(val === 'true'));
  setupPills('mistakePills', val => { STATE.mistakeReason = val; });

  document.getElementById('inputAnswer').addEventListener('input', updateCharCount);
  document.getElementById('inputAnswer').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCompleteQuest();
  });
  document.getElementById('btnCompleteQuest').addEventListener('click', handleCompleteQuest);
  document.getElementById('btnClaudeReview').addEventListener('click', requestClaudeReview);
}

function updateCharCount() {
  const len = document.getElementById('inputAnswer').value.length;
  document.getElementById('answerCharCount').textContent = `${len} 文字`;
}

function setEvalState(isCorrect) {
  STATE.isCorrect = isCorrect;
  setHidden('mistakeDrawer', isCorrect);
  if (!isCorrect) {
    const active = document.querySelector('#mistakePills .pill.active');
    STATE.mistakeReason = active ? active.getAttribute('data-val') : '読み落とし';
  }
}

function startTimer(minutes) {
  stopTimer();
  STATE.timer.totalSeconds = minutes * 60;
  STATE.timer.remainingSeconds = minutes * 60;
  document.getElementById('timerClock').classList.remove('over');
  updateTimerText();
  resumeTimer();
}

function resumeTimer() {
  STATE.timer.isRunning = true;
  document.getElementById('btnTimerPlayPause').textContent = '⏸';
  STATE.timer.intervalId = setInterval(() => {
    if (STATE.timer.remainingSeconds > 0) {
      STATE.timer.remainingSeconds--;
      updateTimerText();
      if (STATE.timer.remainingSeconds === 0) {
        document.getElementById('timerClock').classList.add('over');
        showToast('⏱ 時間になりました。答案を仕上げて保存しましょう', 'warn');
        stopTimer();
      }
    }
  }, 1000);
}

function toggleTimer() {
  if (STATE.timer.isRunning) {
    stopTimer();
  } else if (STATE.timer.remainingSeconds > 0) {
    resumeTimer();
  }
}

function stopTimer() {
  clearInterval(STATE.timer.intervalId);
  STATE.timer.isRunning = false;
  document.getElementById('btnTimerPlayPause').textContent = '▶';
}

function updateTimerText() {
  const { remainingSeconds, totalSeconds } = STATE.timer;
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  document.getElementById('timerClock').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const pct = totalSeconds ? (remainingSeconds / totalSeconds) * 100 : 0;
  document.getElementById('timerBarFill').style.width = `${pct}%`;
}

async function handleCompleteQuest() {
  const ans = document.getElementById('inputAnswer').value.trim();
  if (!ans) {
    showToast('答案またはメモを入力してください', 'error');
    document.getElementById('inputAnswer').focus();
    return;
  }

  const quest = STATE.currentQuest;
  const btn = document.getElementById('btnCompleteQuest');
  btn.disabled = true;
  btn.textContent = STATE.jev.jevConfigured ? 'Jev が判定中...' : '保存中...';
  stopTimer();

  const payload = {
    itemId: quest.itemId || null,
    retryOf: quest.historyId || null,
    category: quest.category,
    questType: quest.type,
    title: quest.title,
    minutes: quest.recommendedMinutes || STATE.conditions.minutes,
    reason: quest.reason,
    criteria: quest.criteria,
    decisionSource: quest.decisionSource,
    userAnswer: ans,
    isCorrect: STATE.isCorrect,
    mistakeReason: STATE.isCorrect ? '' : STATE.mistakeReason,
    mistakeDetail: document.getElementById('inputMistakeDetail').value.trim(),
    keywords: document.getElementById('inputKeywords').value.trim(),
    questionText: document.getElementById('inputQuestionText').value.trim()
  };

  try {
    const data = await api('/api/history', { body: payload });
    if (!data.success) {
      showToast(data.error || '保存に失敗しました', 'error');
      return;
    }
    renderCompletion(data);
    updateReviewBadge();
  } catch (err) {
    showToast('保存中に通信エラーが発生しました', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '保存して完了 ✅';
  }
}

function renderCompletion(data) {
  setHidden('questRunCard', true);
  setHidden('completionBanner', false);

  const ev = data.evaluation || {};
  const byJev = ev.decisionSource === 'jev';
  document.getElementById('compTitle').textContent = 'お疲れさまでした！';
  document.getElementById('compScoreTag').textContent = `理解度: ${SCORE_LABELS[ev.understandingScore] || ev.understandingScore}`;
  document.getElementById('compReviewTag').textContent = ev.needsReview ? '復習: 数日後にもう一度' : '復習: 不要';
  document.getElementById('compSourceTag').textContent = byJev ? '判定: 🧠 Jev (Score / Noul)' : '判定: 📋 ルール';

  let msg;
  if (data.resolvedHistoryId) {
    msg = '再挑戦に成功！ この弱点は「克服済み」になりました。';
  } else if (!STATE.isCorrect) {
    msg = `つまずき「${STATE.mistakeReason}」を記録しました。数日後に再挑戦クエストとして出題されます。`;
  } else if (ev.needsReview) {
    msg = 'できました！ 定着のため、しばらくしてから復習クエストが出ます。';
  } else {
    msg = 'しっかり理解できています。この調子で進めましょう！';
  }
  document.getElementById('compMessage').textContent = msg;

  const notes = data.answerNotes || '';
  setHidden('compAnswerNotes', !notes);
  document.getElementById('compAnswerNotesText').textContent = notes;
  setHidden('compWrongBox', true);

  // キーワード照合の結果
  const kw = data.keywordResult;
  setHidden('compKeywordBox', !kw);
  if (kw) {
    document.getElementById('compKeywordChips').innerHTML =
      `<p class="keyword-rate">${kw.matched.length} / ${kw.matched.length + kw.missing.length} 個のキーワードが答案に含まれています</p>` +
      kw.matched.map(k => `<span class="kw-chip ok">✔ ${escapeHtml(k)}</span>`).join('') +
      kw.missing.map(k => `<span class="kw-chip ng">✖ ${escapeHtml(k)}</span>`).join('');
  }

  // 記述式は解答例へのリンクと Claude の添削
  const quest = STATE.currentQuest || {};
  const isWritten = quest.type === '過去問を解く' || (quest.type === '誤答を直す' && !quest.focus);
  STATE.lastHistoryId = data.history ? data.history.id : null;
  setHidden('compReviewBox', !isWritten);
  if (isWritten) {
    const link = document.getElementById('compAnswerLink');
    link.hidden = !quest.answerUrl;
    if (quest.answerUrl) link.href = quest.answerUrl;
    const configured = Boolean(STATE.jev.reviewConfigured);
    document.getElementById('btnClaudeReview').disabled = !configured;
    document.getElementById('claudeReviewHint').textContent = configured
      ? '答案と、入力した設問文・キーワードを Claude に送って、良い点・改善点・書き方の例を返してもらいます。'
      : '添削は管理者が環境変数 ANTHROPIC_API_KEY を設定すると使えるようになります。';
    setHidden('compReviewResult', true);
  }

  document.getElementById('completionBanner').scrollIntoView({ behavior: 'smooth' });
}

async function requestClaudeReview() {
  if (!STATE.lastHistoryId) return;
  const btn = document.getElementById('btnClaudeReview');
  const box = document.getElementById('compReviewResult');
  btn.disabled = true;
  btn.textContent = '🤖 添削中...（30秒ほどかかります）';
  try {
    const data = await api('/api/review', { body: { historyId: STATE.lastHistoryId } });
    if (!data.success) {
      showToast(data.error || '添削できませんでした', 'error');
      return;
    }
    box.textContent = data.review.feedback;
    box.hidden = false;
  } catch (err) {
    showToast('添削中に通信エラーが発生しました', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🤖 Claude に添削してもらう';
  }
}

// --- 5. 復習タブ ---
function isPendingReview(h) {
  // 一問一答はカードごとの間隔反復で復習するので、学習記録単位の再挑戦には出さない
  return !h.isCorrect && !h.resolved && h.noulNeedsReview !== false && h.kind !== 'quiz';
}

async function loadReviewList() {
  const container = document.getElementById('reviewItemsContainer');
  const countsRow = document.getElementById('mistakeCountsRow');
  container.innerHTML = '<p class="text-muted">読み込み中...</p>';

  try {
    const [histData, itemData] = await Promise.all([api('/api/history'), api('/api/registered-items')]);
    const history = histData.history || [];
    const items = itemData.items || [];
    const pending = history.filter(isPendingReview);
    renderQuizReviewCard(histData.quizStats);

    if (pending.length === 0) {
      container.innerHTML = '<div class="empty-state">🎉 再挑戦待ちの問題はありません</div>';
    } else {
      const now = Date.now();
      container.innerHTML = pending.map(h => {
        const due = !h.nextReviewDate || new Date(h.nextReviewDate).getTime() <= now;
        const dueLabel = due ? '<span class="due-badge">今日やる</span>' : `<span class="due-badge later">${h.nextReviewDate.slice(5, 10).replace('-', '/')} 以降</span>`;
        return `
        <div class="review-item-card">
          <div class="review-item-main">
            <div class="review-item-tags">
              <span class="tag tag-cat">${escapeHtml(categoryName(h.category))}</span>
              <span class="mistake-badge">原因: ${escapeHtml(h.mistakeReason || '誤答')}</span>
              ${dueLabel}
            </div>
            <h4>${escapeHtml(h.title)}</h4>
            <div class="review-item-meta">
              <span>${escapeHtml(h.mistakeDetail || '詳細メモなし')}</span>
              <span>演習日: ${h.completedAt ? h.completedAt.slice(0, 10) : '-'}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm btn-re-try" data-hid="${escapeHtml(h.id)}">再挑戦する</button>
        </div>`;
      }).join('');

      container.querySelectorAll('.btn-re-try').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = history.find(item => item.id === btn.getAttribute('data-hid'));
          if (!target) return;
          const item = items.find(i => i.id === target.itemId);
          switchTab('quest');
          startQuestRun({
            type: '誤答を直す',
            category: target.category,
            title: `【再挑戦】${target.title.replace(/^【再挑戦】/, '')}`,
            sourceRef: item ? item.source : '前回の記録',
            questionText: item && item.questionText
              ? item.questionText
              : `【前回のあなたの答案】\n${target.userAnswer || '(なし)'}\n\n解説を見ずに、正しい答案を作成してください。`,
            previousMistake: `${target.mistakeReason || '誤答'}: ${target.mistakeDetail || ''}`,
            recommendedMinutes: 20,
            reason: '前回のつまずきを克服するため、解説を見ずに再挑戦します。',
            criteria: '前回の誤りを修正し、設問の要求を満たす答案が書けること。',
            itemId: target.itemId,
            historyId: target.id,
            decisionSource: 'manual'
          });
        });
      });
    }

    const counts = { '読み落とし': 0, '知識不足': 0, '設問要求とのずれ': 0, '時間不足': 0 };
    history.forEach(h => {
      if (!h.isCorrect && h.mistakeReason && counts[h.mistakeReason] !== undefined) {
        counts[h.mistakeReason]++;
      }
    });
    const max = Math.max(1, ...Object.values(counts));
    countsRow.innerHTML = Object.entries(counts).map(([name, count]) => `
      <div class="mistake-count-box${count === max && count > 0 ? ' top' : ''}">
        <div class="mistake-name">${name}</div>
        <div class="mistake-num">${count}<small>回</small></div>
      </div>
    `).join('');

    renderHistoryList(history);
  } catch (err) {
    container.innerHTML = '<p class="text-muted">読み込みに失敗しました</p>';
  }
}

function renderHistoryList(history) {
  const list = document.getElementById('historyList');
  const recent = history.slice(0, 10);
  if (recent.length === 0) {
    list.innerHTML = '<p class="text-muted">まだ記録がありません。最初のクエストをやってみましょう。</p>';
    return;
  }
  list.innerHTML = recent.map(h => {
    const status = h.isCorrect ? '<span class="hist-ok">⭕</span>' : (h.resolved ? '<span class="hist-ok">✔ 克服</span>' : '<span class="hist-ng">❌</span>');
    const src = h.decisionSource === 'jev' ? '<span class="mini-jev" title="Jev が選定">Jev</span>' : '';
    return `
      <div class="history-row">
        <span class="history-date">${h.completedAt ? h.completedAt.slice(5, 10).replace('-', '/') : '-'}</span>
        ${status}
        <span class="history-title">${escapeHtml(h.title)}</span>
        ${src}
        <span class="history-score">${escapeHtml(SCORE_LABELS[h.understandingScore] || '')}</span>
      </div>`;
  }).join('');
}

async function updateReviewBadge() {
  try {
    const data = await api('/api/history');
    // 一問一答は「前回間違えて復習期限が来た問題」だけをバッジに数える
    const quizWrongDue = data.quizStats ? data.quizStats.wrongDue : 0;
    const pendingCount = (data.history || []).filter(isPendingReview).length + quizWrongDue;
    const badge = document.getElementById('reviewCountBadge');
    badge.textContent = pendingCount;
    badge.hidden = pendingCount === 0;
  } catch (e) { /* バッジ更新失敗は無視 */ }
}

// --- 6. 素材の登録 ---
function initRegisterForms() {
  document.querySelectorAll('.subtab').forEach(st => {
    st.addEventListener('click', () => {
      document.querySelectorAll('.subtab').forEach(b => b.classList.remove('active'));
      st.classList.add('active');
      const target = st.getAttribute('data-sub');
      document.getElementById('formSimpleSC').classList.toggle('active', target === 'sub-sc');
      document.getElementById('formSimpleCU').classList.toggle('active', target === 'sub-cu');
    });
  });

  document.getElementById('formSimpleSC').addEventListener('submit', async (e) => {
    e.preventDefault();
    await postItem({
      type: 'sc_past_paper',
      category: 'sc',
      title: document.getElementById('inScTitle').value.trim(),
      source: document.getElementById('inScSource').value.trim(),
      publishedDate: document.getElementById('inScDate').value,
      questionText: document.getElementById('inScQuestion').value.trim(),
      notes: document.getElementById('inScNotes').value.trim(),
      keywords: document.getElementById('inScKeywords').value.trim(),
      url: document.getElementById('inScUrl').value.trim(),
      nextAction: '既存知識と比較する'
    }, e.target);
  });

  document.getElementById('formSimpleCU').addEventListener('submit', async (e) => {
    e.preventDefault();
    await postItem({
      type: 'catchup',
      category: document.getElementById('inCuCat').value,
      title: document.getElementById('inCuTitle').value.trim(),
      source: document.getElementById('inCuSource').value.trim(),
      url: document.getElementById('inCuUrl').value.trim(),
      nextAction: document.getElementById('inCuAction').value,
      notes: document.getElementById('inCuNotes').value.trim()
    }, e.target);
  });
}

async function postItem(payload, formEl) {
  try {
    const data = await api('/api/registered-items', { body: payload });
    if (data.success) {
      showToast('登録しました。今後のクエスト候補に加わります', 'success');
      formEl.reset();
      loadItemList();
      loadRecommendedQuest();
    } else {
      showToast(data.error || '登録に失敗しました', 'error');
    }
  } catch (err) {
    showToast('通信エラーが発生しました', 'error');
  }
}

async function loadItemList() {
  const list = document.getElementById('itemList');
  try {
    const data = await api('/api/registered-items');
    const items = data.items || [];
    document.getElementById('itemCount').textContent = `${items.length}件`;
    if (items.length === 0) {
      list.innerHTML = '<p class="text-muted">まだ素材がありません。上のフォームから登録しましょう。</p>';
      return;
    }
    list.innerHTML = items.map(i => `
      <div class="item-row">
        <span class="tag tag-cat">${escapeHtml(categoryName(i.category))}</span>
        <span class="item-title">${escapeHtml(i.title)}</span>
        ${i.isSample ? '<span class="tag tag-type">サンプル</span>' : ''}
        <span class="item-meta">${i.type === 'sc_past_paper' ? '過去問' : escapeHtml(i.nextAction || '')}</span>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<p class="text-muted">読み込みに失敗しました</p>';
  }
}

// --- 7. 設定 (Jev / データ) ---
function initSettings() {
  const keyInput = document.getElementById('txtJevKey');

  document.getElementById('btnToggleKey').addEventListener('click', () => {
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
  });

  keyInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveAndTestKey();
  });

  document.getElementById('btnSaveJevKey').addEventListener('click', saveAndTestKey);

  document.getElementById('btnTestJev').addEventListener('click', async () => {
    await runJevTest('');
  });
  document.getElementById('btnTestJevCloud').addEventListener('click', async () => {
    await runJevTest('');
  });

  document.getElementById('btnDeleteJevKey').addEventListener('click', async () => {
    if (!confirm('保存済みの Jev APIキーを削除しますか？（ルールで動作するようになります）')) return;
    const data = await api('/api/settings/jev-key', { body: { apiKey: '' } });
    showToast(data.message || data.error || '削除しました', data.success ? 'info' : 'error');
    setHidden('jevTestResult', true);
    await checkJevStatus();
  });

  document.getElementById('btnExportJson').addEventListener('click', downloadBackup);

  document.getElementById('inImportJson').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm(`「${file.name}」で現在のデータを置き換えます。よろしいですか？`)) return;
    try {
      const json = JSON.parse(await file.text());
      const data = await api('/api/backup', { body: json });
      showToast(data.message || data.error, data.success ? 'success' : 'error');
      if (data.success) {
        loadRecommendedQuest();
        updateReviewBadge();
      }
    } catch (err) {
      showToast('JSONファイルを読み込めませんでした', 'error');
    }
  });

  document.getElementById('btnAddSamples').addEventListener('click', () => seedAction('add_samples'));
  document.getElementById('btnResetSamples').addEventListener('click', () => {
    if (confirm('サンプルデータを削除しますか？（あなたが登録したデータは残ります）')) {
      seedAction('clear_samples');
    }
  });
}

async function seedAction(action) {
  const data = await api('/api/seed', { body: { action } });
  showToast(data.message || data.error || '完了しました', data.success ? 'success' : 'error');
  loadRecommendedQuest();
  updateReviewBadge();
}

async function saveAndTestKey() {
  const keyInput = document.getElementById('txtJevKey');
  const key = keyInput.value.trim();
  if (!key) {
    showToast('APIキーを入力してください', 'error');
    keyInput.focus();
    return;
  }

  const btn = document.getElementById('btnSaveJevKey');
  btn.disabled = true;
  try {
    // 先に接続テストし、キーが無効（認証エラー）なら保存しない
    const test = await runJevTest(key, { saving: true });
    if (!test || (!test.success && test.errorType === 'auth')) return;

    const saved = await api('/api/settings/jev-key', { body: { apiKey: key } });
    if (!saved.success) {
      showToast(saved.error || '保存に失敗しました', 'error');
      return;
    }
    showToast(test.success ? 'Jev APIキーを保存しました' : 'キーを保存しました（接続は後で再確認してください）', test.success ? 'success' : 'warn');
    keyInput.value = '';
    keyInput.type = 'password';
    await checkJevStatus();
    if (test.success) loadRecommendedQuest();
  } finally {
    btn.disabled = false;
  }
}

async function runJevTest(key, { saving = false } = {}) {
  const resultBox = document.getElementById('jevTestResult');
  resultBox.hidden = false;
  resultBox.className = 'jev-test-result';
  resultBox.textContent = 'Jev に接続しています...';

  try {
    const data = await api('/api/settings/test-jev', { body: { apiKey: key } });
    if (data.success) {
      resultBox.className = 'jev-test-result success';
      resultBox.innerHTML = `✅ <strong>${escapeHtml(data.message)}</strong><br>これからのクエスト選定と理解度判定に Jev が使われます。`;
    } else {
      let note = 'Jev に接続できない間は、アプリ内ルールで動作します。';
      if (saving && data.errorType === 'auth') note = 'キーは保存していません。正しいキーを入力し直してください。';
      else if (saving) note = 'キーは保存しました。ネットワークが回復すれば Jev が使われます。';
      resultBox.className = 'jev-test-result error';
      resultBox.innerHTML = `⚠️ <strong>接続できませんでした:</strong> ${escapeHtml(data.error || '通信エラー')}<br><small>${note}</small>`;
    }
    return data;
  } catch (err) {
    resultBox.className = 'jev-test-result error';
    resultBox.textContent = `通信エラー: ${err.message}`;
    return null;
  }
}

// --- 8. 一問一答 ---
const QUIZ_FORMAT_KEY = 'jlq.quizFormat';
const OFFLINE_DECK_KEY = 'jlq.offlineDeck';
const PENDING_RESULTS_KEY = 'jlq.pendingQuizResults';
const OFFLINE_DECK_SIZE = 60;

// 形式（自己採点 / 4択）は端末ごとに覚えておく
function preferredQuizFormat() {
  return storageGet(QUIZ_FORMAT_KEY) === 'choice' ? 'choice' : 'self';
}

function initQuiz() {
  document.getElementById('btnQuizReveal').addEventListener('click', revealQuizAnswer);
  document.getElementById('btnQuizRight').addEventListener('click', () => judgeQuizCard(true));
  document.getElementById('btnQuizWrong').addEventListener('click', () => judgeQuizCard(false));
  document.getElementById('btnQuizNext').addEventListener('click', goNextQuizCard);
  document.getElementById('btnQuizQuit').addEventListener('click', quitQuiz);
  document.getElementById('btnQuizReport').addEventListener('click', () => {
    const form = document.getElementById('quizReportForm');
    form.hidden = !form.hidden;
    if (!form.hidden) document.getElementById('quizReportNote').focus();
  });
  document.getElementById('btnQuizReportSend').addEventListener('click', sendQuizReport);
  document.getElementById('btnQuizReview').addEventListener('click', () => {
    switchTab('quest');
    startQuizRun({
      type: '一問一答',
      category: 'sc',
      title: '【復習】一問一答',
      quiz: { exam: 'all', mode: 'review', count: 20 },
      reason: '間違えた問題と、忘れかけた問題を出し直して記憶を定着させます。',
      criteria: '答えを見る前に自分の答えを言えること。',
      decisionSource: 'manual'
    });
  });

  // キーボード操作
  //   自己採点: Space/Enter で答えを表示、Y/→ で覚えてた、N/← でまだ
  //   4択: 1〜4 で選択、Enter で次へ
  document.addEventListener('keydown', e => {
    if (!STATE.quiz || document.getElementById('quizRunCard').hidden) return;
    const typing = e.target instanceof Element && e.target.closest('input, textarea, select');
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    const card = STATE.quiz.cards[STATE.quiz.index];
    const revealed = !document.getElementById('quizAnswerBox').hidden;
    if (card && card.choices) {
      if (!revealed && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        chooseQuizAnswer(parseInt(e.key, 10) - 1);
      } else if (revealed && e.key === 'Enter') {
        e.preventDefault();
        goNextQuizCard();
      }
      return;
    }
    if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      revealQuizAnswer();
    } else if (revealed && (e.key === 'y' || e.key === 'Y' || e.key === 'ArrowRight')) {
      e.preventDefault();
      judgeQuizCard(true);
    } else if (revealed && (e.key === 'n' || e.key === 'N' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      judgeQuizCard(false);
    }
  });

  // 報告理由の選択肢（サーバーの定義と同じ）
  const reasonSelect = document.getElementById('quizReportReason');
  ['答えが間違っている', '問題文が分かりにくい', '元の過去問と内容が合っていない', 'その他']
    .forEach(r => reasonSelect.add(new Option(r, r)));
}

async function startQuizRun(quest) {
  const quiz = { format: preferredQuizFormat(), ...(quest.quiz || {}) };
  let cards;
  if (STATE.offline) {
    cards = offlineDeckCards(quiz);
  } else {
    try {
      const params = new URLSearchParams(Object.entries(quiz).map(([k, v]) => [k, String(v)]));
      const data = await api(`/api/quiz/deck?${params}`);
      cards = data.cards || [];
    } catch (err) {
      // 通信できないときは保存しておいた問題で続ける
      enterOfflineMode();
      cards = offlineDeckCards(quiz);
    }
  }
  if (cards.length === 0) {
    const msg = quiz.mode === 'review' ? '復習期限が来た問題はありません'
      : quiz.mode === 'weak' ? '弱点分野はまだありません（5回以上解いた分野で正答率7割未満のものが弱点になります）'
        : STATE.offline ? 'オフライン用の問題がありません。オンラインのときに一度アプリを開いてください'
          : '出題できる問題がありません（すべて学習済みです）';
    showToast(msg, 'info');
    return;
  }

  stopTimer();
  STATE.currentQuest = quest;
  STATE.quiz = { quest, cards, index: 0, answers: [], startedAt: Date.now(), saving: false, format: quiz.format };
  setHidden('questHeroCard', true);
  setHidden('questRunCard', true);
  setHidden('completionBanner', true);
  setHidden('quizRunCard', false);
  document.getElementById('quizTitle').textContent = quest.title;
  renderQuizCard();
  document.getElementById('quizRunCard').scrollIntoView({ behavior: 'smooth' });
}

function renderQuizCard() {
  const { cards, index, answers } = STATE.quiz;
  const card = cards[index];
  document.getElementById('quizCounter').textContent = `${index + 1} / ${cards.length}`;
  document.getElementById('quizBarFill').style.width = `${(index / cards.length) * 100}%`;
  document.getElementById('quizSourceTag').textContent = card.sourceLabel;
  document.getElementById('quizTopic').textContent = card.field ? `${card.topic}（${card.field}）` : card.topic;
  document.getElementById('quizQuestion').textContent = card.question;
  document.getElementById('quizAnswer').textContent = card.answer;
  document.getElementById('quizAnswerLabel').textContent = '💡 答え';
  document.getElementById('quizSourceLink').href = card.url;
  document.getElementById('quizReportNote').value = '';
  setHidden('quizReportForm', true);
  setHidden('quizAnswerBox', true);
  setHidden('quizJudge', true);
  setHidden('quizNext', true);

  const choicesBox = document.getElementById('quizChoices');
  if (card.choices) {
    setHidden('btnQuizReveal', true);
    choicesBox.innerHTML = card.choices.map((c, i) => `
      <button class="quiz-choice" type="button" data-idx="${i}"><span class="choice-no">${i + 1}</span>${escapeHtml(c)}</button>`).join('');
    choicesBox.querySelectorAll('.quiz-choice').forEach(btn => {
      btn.addEventListener('click', () => chooseQuizAnswer(parseInt(btn.getAttribute('data-idx'), 10)));
    });
    choicesBox.hidden = false;
  } else {
    choicesBox.hidden = true;
    choicesBox.innerHTML = '';
    setHidden('btnQuizReveal', false);
  }
  const correct = answers.filter(a => a.correct).length;
  document.getElementById('quizScore').textContent = answers.length ? `⭕ ${correct} / ❌ ${answers.length - correct}` : '';
}

function revealQuizAnswer() {
  setHidden('quizAnswerBox', false);
  setHidden('quizJudge', false);
  setHidden('btnQuizReveal', true);
}

// 4択: 選んだら自動で採点し、答えを見せて「次へ」を待つ
function chooseQuizAnswer(idx) {
  const quiz = STATE.quiz;
  const card = quiz.cards[quiz.index];
  if (!card.choices || !document.getElementById('quizAnswerBox').hidden) return;
  const correct = card.choices[idx] === card.answer;
  document.querySelectorAll('#quizChoices .quiz-choice').forEach((btn, i) => {
    btn.disabled = true;
    if (card.choices[i] === card.answer) btn.classList.add('correct');
    else if (i === idx) btn.classList.add('wrong');
  });
  quiz.answers.push({ id: card.id, correct });
  document.getElementById('quizAnswerLabel').textContent = correct ? '⭕ 正解！' : '❌ 不正解 — 正しい答え';
  setHidden('quizAnswerBox', false);
  setHidden('quizNext', false);
  document.getElementById('btnQuizNext').focus({ preventScroll: true });
}

function goNextQuizCard() {
  const quiz = STATE.quiz;
  if (!quiz || quiz.saving) return;
  quiz.index++;
  if (quiz.index < quiz.cards.length) renderQuizCard();
  else finishQuiz();
}

function judgeQuizCard(correct) {
  const quiz = STATE.quiz;
  if (!quiz || quiz.saving) return;
  quiz.answers.push({ id: quiz.cards[quiz.index].id, correct });
  goNextQuizCard();
}

async function sendQuizReport() {
  const quiz = STATE.quiz;
  if (!quiz) return;
  const card = quiz.cards[quiz.index];
  if (STATE.offline) {
    showToast('オフライン中は報告できません。オンラインのときにもう一度お試しください', 'warn');
    return;
  }
  const data = await api('/api/quiz/reports', {
    body: {
      cardId: card.id,
      reason: document.getElementById('quizReportReason').value,
      note: document.getElementById('quizReportNote').value.trim()
    }
  });
  if (data.success) {
    showToast('報告しました。教材タブの「報告した問題」から確認できます', 'success');
    setHidden('quizReportForm', true);
  } else {
    showToast(data.error || '報告できませんでした', 'error');
  }
}

async function quitQuiz() {
  const quiz = STATE.quiz;
  if (quiz && quiz.answers.length > 0
    && confirm(`ここまでの${quiz.answers.length}問の結果を保存して終わりますか？\n（キャンセルすると保存せずに中断します）`)) {
    await finishQuiz();
    return;
  }
  STATE.quiz = null;
  setHidden('quizRunCard', true);
  setHidden('questHeroCard', false);
}

async function finishQuiz() {
  const quiz = STATE.quiz;
  if (quiz.saving) return;
  quiz.saving = true;
  document.getElementById('quizBarFill').style.width = '100%';
  const payload = {
    answers: quiz.answers,
    title: quiz.quest.title,
    minutes: Math.max(1, Math.round((Date.now() - quiz.startedAt) / 60000)),
    reason: quiz.quest.reason,
    criteria: quiz.quest.criteria,
    decisionSource: quiz.quest.decisionSource,
    format: quiz.format
  };
  try {
    if (STATE.offline) {
      queueQuizResult(payload, quiz);
      return;
    }
    const data = await api('/api/quiz/answers', { body: payload });
    if (!data.success) {
      showToast(data.error || '結果を保存できませんでした', 'error');
      return;
    }
    STATE.quiz = null;
    setHidden('quizRunCard', true);
    renderQuizCompletion(data);
    updateReviewBadge();
  } catch (err) {
    // 通信が切れていたら、あとで送る
    enterOfflineMode();
    queueQuizResult(payload, quiz);
  } finally {
    quiz.saving = false;
  }
}

function renderQuizCompletion(data) {
  setHidden('completionBanner', false);
  const ev = data.evaluation || {};
  document.getElementById('compTitle').textContent = data.summary;
  document.getElementById('compScoreTag').textContent = `理解度: ${SCORE_LABELS[ev.understandingScore] || '-'}`;
  document.getElementById('compReviewTag').textContent = data.wrongCards.length ? `復習: ${data.wrongCards.length}問を明日` : '復習: 間隔をあけて再確認';
  document.getElementById('compSourceTag').textContent = ev.decisionSource === 'jev' ? '判定: 🧠 Jev (Score / Noul)'
    : ev.decisionSource === 'offline' ? '判定: 📴 オンライン復帰後に保存' : '判定: 📋 ルール';
  const all = data.stats && data.stats.all;
  const weak = (data.weakFields || []).map(f => `${f.name}（${Math.round(f.accuracy * 100)}%）`).join('、');
  document.getElementById('compMessage').textContent = data.message || (all
    ? `一問一答の学習済み: ${all.studied} / ${all.total}問（定着 ${all.mastered}問）。${weak ? `弱点分野: ${weak}。` : ''}⭕の問題も 3日後・7日後…と間隔をあけて再確認します。`
    : '');
  setHidden('compAnswerNotes', true);
  setHidden('compKeywordBox', true);
  setHidden('compReviewBox', true);

  document.getElementById('compWrongList').innerHTML = data.wrongCards.map(c => `
    <li>
      <span class="wrong-q">${escapeHtml(c.question)}</span>
      <span class="wrong-a">→ ${escapeHtml(c.answer)}</span>
      <a href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.sourceLabel)} ↗</a>
    </li>`).join('');
  setHidden('compWrongBox', data.wrongCards.length === 0);
  document.getElementById('completionBanner').scrollIntoView({ behavior: 'smooth' });
}

function renderQuizReviewCard(stats) {
  const due = stats ? stats.due : 0;
  setHidden('quizReviewCard', due === 0);
  if (due > 0) {
    document.getElementById('quizReviewText').textContent = stats.wrongDue
      ? `復習期限が来た問題が ${due}問あります（うち前回間違えた問題 ${stats.wrongDue}問）。`
      : `復習期限が来た問題が ${due}問あります。`;
  }
}

// --- 9. 教材タブ ---
function initLibrary() {
  const formatSelect = document.getElementById('libFormat');
  formatSelect.value = preferredQuizFormat();
  formatSelect.addEventListener('change', () => storageSet(QUIZ_FORMAT_KEY, formatSelect.value));

  document.getElementById('btnLibStartQuiz').addEventListener('click', () => {
    const sessionSelect = document.getElementById('libSession');
    const groupSelect = document.getElementById('libGroup');
    const exam = document.getElementById('libExam').value;
    const session = sessionSelect.value;
    const group = groupSelect.value;
    const mode = document.getElementById('libMode').value;
    const format = formatSelect.value;
    const count = parseInt(document.getElementById('libCount').value, 10);
    const examName = { all: '応用情報 午前 + 支援士 午前II', sc: '支援士 午前II', ap: '応用情報 午前' }[exam];
    const labels = [session === 'all' ? '過去5年分' : sessionSelect.selectedOptions[0].textContent];
    if (mode === 'weak') labels.push('弱点分野');
    else if (group !== 'all') labels.push(groupSelect.selectedOptions[0].textContent);
    if (format === 'choice') labels.push('4択');
    switchTab('quest');
    startQuizRun({
      type: '一問一答',
      category: 'sc',
      title: `一問一答: ${examName}（${labels.join('・')}・${count}問）`,
      quiz: { exam, session, group, mode, count, format },
      reason: '教材タブから選んだ一問一答です。',
      criteria: '答えを見る前に自分の答えを思い浮かべ、正直に採点すること。',
      decisionSource: 'manual'
    });
  });

  document.getElementById('btnWeakQuiz').addEventListener('click', () => {
    switchTab('quest');
    startQuizRun({
      type: '一問一答',
      category: 'sc',
      title: '一問一答: 弱点分野を集中演習（20問）',
      quiz: { exam: 'all', mode: 'weak', count: 20 },
      reason: '正答率の低い分野を重点的に解いて、弱点を埋めます。',
      criteria: '弱点分野の正答率を上げること。',
      decisionSource: 'manual'
    });
  });

  document.getElementById('btnCopyReports').addEventListener('click', copyReports);

  setupPills('readingFilterPills', val => {
    STATE.readingFilter = val;
    renderReadingList();
  });
  setupPills('writtenFilterPills', val => {
    STATE.writtenFilter = val;
    renderWrittenList();
  });
}

async function loadLibrary() {
  if (STATE.offline) {
    showToast('オフライン中は教材の一覧を読み込めません', 'warn');
    return;
  }
  try {
    const data = await api('/api/content');
    if (!data.quiz) return;
    STATE.library = data;

    const sessionSelect = document.getElementById('libSession');
    if (sessionSelect.options.length === 1) {
      data.quiz.sessions.forEach(s => sessionSelect.add(new Option(s.label, s.session)));
    }
    const groupSelect = document.getElementById('libGroup');
    if (groupSelect.options.length === 1) {
      data.quiz.groups.forEach(g => groupSelect.add(new Option(`${g.name}（${g.area}）`, g.id)));
    }

    const stats = data.quiz.stats;
    document.getElementById('quizStatsGrid').innerHTML = Object.entries(data.quiz.exams).map(([key, exam]) => {
      const s = stats[key];
      const pct = s.total ? Math.round((s.studied / s.total) * 100) : 0;
      return `
        <div class="quiz-stat-box">
          <div class="quiz-stat-name">${escapeHtml(exam.name)}</div>
          <div class="quiz-stat-num">${s.studied}<small> / ${s.total}問</small></div>
          <div class="quiz-stat-bar"><div data-pct="${pct}"></div></div>
          <div class="quiz-stat-meta">定着 ${s.mastered}問 ・ 復習待ち ${s.due}問</div>
        </div>`;
    }).join('');

    renderFieldStats(data.quiz.fields);
    renderReports(data.quiz.reports);
    applyBarWidths();
    renderWrittenList();
    renderReadingList();
    loadAiFeed();
  } catch (e) {
    showToast('教材を読み込めませんでした', 'error');
  }
}

// CSP でインライン style 属性は使えないので、棒グラフの幅は DOM から設定する
function applyBarWidths() {
  document.querySelectorAll('#view-library [data-pct]').forEach(bar => {
    bar.style.width = `${bar.getAttribute('data-pct')}%`;
  });
}

function renderFieldStats(fields) {
  const list = document.getElementById('fieldStatsList');
  const judged = fields.filter(f => f.accuracy !== null);
  setHidden('btnWeakQuiz', !fields.some(f => f.weak));
  if (judged.length === 0) {
    list.innerHTML = '<p class="text-muted">まだ判定できるほど解いていません。一問一答を解くと、分野ごとの正答率がここに表示されます。</p>';
    return;
  }
  // 判定済みの分野を正答率の低い順に、未判定の分野は後ろにまとめる
  const sorted = [...judged].sort((a, b) => a.accuracy - b.accuracy);
  const pending = fields.filter(f => f.accuracy === null && f.attempts > 0);
  list.innerHTML = sorted.map(f => {
    const pct = Math.round(f.accuracy * 100);
    return `
      <div class="field-row${f.weak ? ' weak' : ''}">
        <div class="field-name">${f.weak ? '⚠ ' : ''}${escapeHtml(f.name)} <small>${escapeHtml(f.area)}</small></div>
        <div class="field-bar"><div data-pct="${pct}"></div></div>
        <div class="field-pct">${pct}%<small> ${f.correct}/${f.attempts}回</small></div>
      </div>`;
  }).join('') + (pending.length
    ? `<p class="field-hint">判定前（5回未満）: ${pending.map(f => escapeHtml(f.name)).join('、')}</p>`
    : '');
}

function renderReports(reports) {
  STATE.reports = reports;
  setHidden('reportCard', reports.length === 0);
  document.getElementById('reportCount').textContent = `${reports.length}件`;
  const list = document.getElementById('reportList');
  list.innerHTML = reports.map(r => `
    <div class="report-row">
      <div class="reading-main">
        <div class="reading-tags">
          <span class="tag tag-type">${escapeHtml(r.card.sourceLabel)}</span>
          <span class="mistake-badge">${escapeHtml(r.reason)}</span>
        </div>
        <p class="report-q">${escapeHtml(r.card.question)}</p>
        <p class="report-a">→ ${escapeHtml(r.card.answer)}</p>
        ${r.note ? `<p class="report-note">メモ: ${escapeHtml(r.note)}</p>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" data-report="${escapeHtml(r.id)}" type="button">削除</button>
    </div>`).join('');
  list.querySelectorAll('button[data-report]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('/api/quiz/reports/delete', { body: { reportId: btn.getAttribute('data-report') } });
      loadLibrary();
    });
  });
}

// 報告を、Issue や修正依頼にそのまま貼れる Markdown にしてコピーする
async function copyReports() {
  const reports = STATE.reports || [];
  const text = [
    '## 一問一答の問題報告',
    '',
    ...reports.map(r => [
      `### ${r.card.id}（${r.card.sourceLabel}）`,
      `- 理由: ${r.reason}${r.note ? ` / ${r.note}` : ''}`,
      `- 問題: ${r.card.question}`,
      `- 現在の答え: ${r.card.answer}`,
      `- 元の過去問: ${r.card.url}`,
      ''
    ].join('\n'))
  ].join('\n');
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${reports.length}件の報告をコピーしました`, 'success');
  } catch (e) {
    showToast('コピーできませんでした（ブラウザの設定を確認してください）', 'error');
  }
}

function renderWrittenList() {
  if (!STATE.library) return;
  const written = STATE.library.written;
  const filter = STATE.writtenFilter || 'todo';
  document.getElementById('writtenCount').textContent = `演習済み ${written.filter(w => w.attempted).length} / ${written.length}問`;
  const filtered = written.filter(w => filter === 'all' || (filter === 'done' ? w.attempted : !w.attempted));
  const list = document.getElementById('writtenList');
  if (filtered.length === 0) {
    list.innerHTML = `<p class="text-muted">${filter === 'done' ? 'まだ演習した問題はありません' : 'すべて演習しました 🎉'}</p>`;
    return;
  }
  list.innerHTML = filtered.map(w => `
    <div class="reading-row">
      <div class="reading-main">
        <div class="reading-tags">
          <span class="tag tag-cat">${escapeHtml(w.title.split('「')[0].trim())}</span>
          <span class="tag tag-time">⏱ ${w.minutes}分</span>
          ${w.done ? '<span class="tag tag-source jev">✔ できた</span>' : (w.attempted ? '<span class="tag tag-source warn">要復習</span>' : '')}
        </div>
        <span class="reading-title">${escapeHtml(w.theme)}</span>
        <p class="reading-focus">
          <a class="run-link" href="${escapeHtml(w.questionPdf)}" target="_blank" rel="noopener noreferrer">問題冊子（IPA）↗</a>
          ・ ${escapeHtml(w.note)}
        </p>
      </div>
      <button class="btn btn-secondary btn-sm" data-wid="${escapeHtml(w.id)}" type="button">${w.attempted ? 'もう一度' : '演習する'}</button>
    </div>`).join('');

  list.querySelectorAll('button[data-wid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const w = written.find(x => x.id === btn.getAttribute('data-wid'));
      if (!w) return;
      switchTab('quest');
      startQuestRun({
        type: '過去問を解く',
        category: 'sc',
        title: `過去問記述演習: 支援士 ${w.title}`,
        sourceRef: 'IPA 過去問題',
        questionText: `IPA の問題冊子（PDF）を開き、${w.title.replace(/「.*」$/, '')}を解いてください。\n目安: ${w.minutes}分（本試験は${w.note}）\n\n答案は設問ごとに「設問1(1): …」の形で書きます。解き終わったら解答例と照らし合わせて自己採点してください。`,
        url: w.questionPdf,
        answerUrl: w.answerPdf,
        recommendedMinutes: w.minutes,
        reason: '支援士の午後/科目Bの本番の問題で、記述力と設問の読解力を鍛えます。',
        criteria: '時間内に全設問の答案を書き、解答例のキーワードと照らし合わせて自己採点すること。',
        itemId: w.itemId,
        decisionSource: 'manual'
      });
    });
  });
}

function renderReadingList() {
  if (!STATE.library) return;
  const readings = STATE.library.readings;
  const doneCount = readings.filter(r => r.done).length;
  document.getElementById('readingCount').textContent = `読了 ${doneCount} / ${readings.length}件`;

  const filter = STATE.readingFilter;
  const filtered = readings.filter(r => filter === 'all' || (filter === 'done' ? r.done : !r.done));
  const list = document.getElementById('readingList');
  if (filtered.length === 0) {
    list.innerHTML = `<p class="text-muted">${filter === 'done' ? 'まだ読了したものはありません' : 'すべて読了しました 🎉'}</p>`;
    return;
  }
  list.innerHTML = filtered.map(r => `
    <div class="reading-row">
      <div class="reading-main">
        <div class="reading-tags">
          <span class="tag tag-cat">${escapeHtml(r.org)}</span>
          <span class="tag tag-type">${escapeHtml(r.kind)}・${r.year}</span>
          <span class="tag tag-time">⏱ ${r.minutes}分・${escapeHtml(r.level)}</span>
          ${r.done ? '<span class="tag tag-source jev">✔ 読了</span>' : ''}
        </div>
        <a class="reading-title" href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)} ↗</a>
        <p class="reading-focus">${escapeHtml(r.focus)}</p>
      </div>
      <button class="btn btn-secondary btn-sm" data-rid="${escapeHtml(r.id)}" type="button">${r.done ? 'もう一度' : '読む'}</button>
    </div>`).join('');

  list.querySelectorAll('button[data-rid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = readings.find(x => x.id === btn.getAttribute('data-rid'));
      if (!r) return;
      switchTab('quest');
      startQuestRun({
        type: 'レポートを読む',
        category: 'ai',
        title: `${r.org}: ${r.title}`,
        sourceRef: `${r.org}（${r.kind}・${r.year}年）`,
        url: r.url,
        focus: r.focus,
        task: r.task,
        recommendedMinutes: r.minutes,
        reason: 'AI 大手が公開している一次情報を読み、要点を自分の言葉で説明できるようにします。',
        criteria: r.task,
        itemId: r.itemId,
        decisionSource: 'manual'
      });
    });
  });
}

// AI の新着（公式ブログ・arXiv）。「素材に追加」でキャッチアップ素材として登録する
async function loadAiFeed() {
  const list = document.getElementById('feedList');
  list.innerHTML = '<p class="text-muted">新着を読み込み中...</p>';
  try {
    const [feed, itemData] = await Promise.all([api('/api/ai-feed'), api('/api/registered-items')]);
    const registeredUrls = new Set((itemData.items || []).map(i => i.url).filter(Boolean));
    document.getElementById('feedUpdated').textContent = feed.fetchedAt
      ? `${new Date(feed.fetchedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 時点`
      : '';
    const items = (feed.items || []).slice(0, 20);
    if (items.length === 0) {
      list.innerHTML = '<p class="text-muted">新着を取得できませんでした。時間をおいて開き直してください。</p>';
      return;
    }
    list.innerHTML = items.map((item, i) => `
      <div class="reading-row">
        <div class="reading-main">
          <div class="reading-tags">
            <span class="tag tag-cat">${escapeHtml(item.source)}</span>
            ${item.publishedAt ? `<span class="tag tag-type">${escapeHtml(item.publishedAt.slice(0, 10))}</span>` : ''}
          </div>
          <a class="reading-title" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)} ↗</a>
          ${item.summary ? `<p class="reading-focus">${escapeHtml(item.summary)}</p>` : ''}
        </div>
        <button class="btn btn-secondary btn-sm" data-feed="${i}" type="button" ${registeredUrls.has(item.url) ? 'disabled' : ''}>
          ${registeredUrls.has(item.url) ? '追加済み' : '素材に追加'}
        </button>
      </div>`).join('') + (feed.errors && feed.errors.length
      ? `<p class="field-hint">取得できなかったサイト: ${feed.errors.map(escapeHtml).join('、')}</p>` : '');

    list.querySelectorAll('button[data-feed]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const item = items[parseInt(btn.getAttribute('data-feed'), 10)];
        btn.disabled = true;
        const data = await api('/api/registered-items', {
          body: {
            type: 'catchup',
            category: item.sourceId === 'microsoft-security' || item.sourceId === 'arxiv-llm-security' ? 'security' : 'ai',
            title: item.title,
            source: item.source,
            url: item.url,
            publishedDate: item.publishedAt ? item.publishedAt.slice(0, 10) : '',
            notes: item.summary,
            nextAction: '既存知識と比較する'
          }
        });
        if (data.success) {
          btn.textContent = '追加済み';
          showToast('素材に追加しました。今日のクエストの候補になります', 'success');
        } else {
          btn.disabled = false;
          showToast(data.error || '追加できませんでした', 'error');
        }
      });
    });
  } catch (e) {
    list.innerHTML = '<p class="text-muted">新着を読み込めませんでした</p>';
  }
}

// --- 10. オフライン（PWA） ---
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => { /* 登録できなくても通常どおり使える */ });
}

function initOffline() {
  document.getElementById('btnOfflineQuiz').addEventListener('click', () => {
    startQuizRun({
      type: '一問一答',
      category: 'sc',
      title: '一問一答（オフライン）',
      quiz: { exam: 'all', mode: 'mix', count: 10 },
      reason: 'オフラインでも、保存しておいた問題で一問一答を続けられます。',
      criteria: '答えを見る前に自分の答えを思い浮かべ、正直に採点すること。',
      decisionSource: 'offline'
    });
  });
  window.addEventListener('offline', () => enterOfflineMode());
  window.addEventListener('online', async () => {
    if (!STATE.offline) return;
    showToast('オンラインに戻りました', 'success');
    // ログイン前にオフラインで起動していた場合は、画面を読み込み直して通常どおり始める
    if (document.getElementById('appShell').dataset.offlineBoot === '1') {
      window.location.reload();
      return;
    }
    STATE.offline = false;
    updateOfflineUi();
    await flushPendingQuizResults();
    loadRecommendedQuest();
  });
}

function loadOfflineDeck() {
  try {
    const deck = JSON.parse(storageGet(OFFLINE_DECK_KEY) || '[]');
    return Array.isArray(deck) ? deck : [];
  } catch (e) {
    return [];
  }
}

function loadPendingResults() {
  try {
    const list = JSON.parse(storageGet(PENDING_RESULTS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

// オンラインのうちに、次に解く問題をまとめて端末に保存しておく（問題は公開教材のみ、個人情報は含まない）
async function refreshOfflineDeck() {
  try {
    const data = await api(`/api/quiz/deck?mode=mix&count=30`);
    const more = await api(`/api/quiz/deck?mode=new&count=30`);
    const seen = new Set();
    const cards = [...(data.cards || []), ...(more.cards || [])]
      .filter(c => !seen.has(c.id) && seen.add(c.id))
      .slice(0, OFFLINE_DECK_SIZE)
      .map(({ id, exam, sessionLabel, no, topic, question, answer, field, group, sourceLabel, url }) =>
        ({ id, exam, sessionLabel, no, topic, question, answer, field, group, sourceLabel, url }));
    if (cards.length) storageSet(OFFLINE_DECK_KEY, JSON.stringify(cards));
  } catch (e) { /* 取れなくても次回に再挑戦 */ }
}

// オフライン用の出題: まだ解いていない（送信待ちに入っていない）問題から選ぶ
function offlineDeckCards(quiz) {
  const answered = new Set(loadPendingResults().flatMap(r => r.answers.map(a => a.id)));
  const deck = loadOfflineDeck();
  const cards = deck
    .filter(c => !answered.has(c.id))
    .filter(c => !quiz.exam || quiz.exam === 'all' || c.exam === quiz.exam)
    .slice(0, quiz.count || 10);
  if (quiz.format !== 'choice') return cards;
  // 4択はオフライン用の問題の答えから選択肢を作る
  return cards.map(card => {
    const others = deck.filter(c => c.id !== card.id && c.answer !== card.answer);
    const sameGroup = others.filter(c => c.group === card.group);
    const pool = [...shuffleList(sameGroup), ...shuffleList(others)];
    const distractors = [...new Set(pool.map(c => c.answer))].slice(0, 3);
    return { ...card, choices: shuffleList([card.answer, ...distractors]) };
  });
}

function shuffleList(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function queueQuizResult(payload, quiz) {
  const pending = loadPendingResults();
  pending.push(payload);
  storageSet(PENDING_RESULTS_KEY, JSON.stringify(pending));
  STATE.quiz = null;
  setHidden('quizRunCard', true);
  const correct = payload.answers.filter(a => a.correct).length;
  const wrongIds = new Set(payload.answers.filter(a => !a.correct).map(a => a.id));
  renderQuizCompletion({
    summary: `${payload.answers.length}問中${correct}問正解`,
    evaluation: { decisionSource: 'offline' },
    wrongCards: quiz.cards.filter(c => wrongIds.has(c.id)),
    message: 'オフラインで解いた結果を端末に保存しました。次にオンラインになったときに自動で送信され、復習の予定に反映されます。'
  });
  updateOfflineUi();
}

async function flushPendingQuizResults() {
  const pending = loadPendingResults();
  if (pending.length === 0) return;
  const rest = [];
  for (const payload of pending) {
    try {
      const data = await api('/api/quiz/answers', { body: payload });
      // 400（該当する問題がない）は送り直しても成功しないので捨てる
      if (!data.success && data.error && !/該当する問題/.test(data.error)) rest.push(payload);
    } catch (e) {
      rest.push(payload);
    }
  }
  storageSet(PENDING_RESULTS_KEY, JSON.stringify(rest));
  const sent = pending.length - rest.length;
  if (sent > 0) {
    showToast(`オフラインで解いた一問一答の結果（${sent}回分）を保存しました`, 'success');
    updateReviewBadge();
  }
}

function enterOfflineMode() {
  if (STATE.offline) return;
  STATE.offline = true;
  // ログイン前（通信できずに起動した場合）でも、一問一答だけは使えるようにする
  if (document.getElementById('appShell').hidden) {
    setHidden('authScreen', true);
    setHidden('appShell', false);
    document.getElementById('appShell').dataset.offlineBoot = '1';
    switchTab('quest');
    setHidden('questHeroCard', true);
  }
  updateOfflineUi();
}

function updateOfflineUi() {
  const offline = Boolean(STATE.offline);
  setHidden('offlineChip', !offline);
  setHidden('offlineBanner', !offline);
  // 条件の選択やクエストの提案はサーバーが必要なので、オフライン中は隠す
  document.querySelector('.filter-bar').hidden = offline;
  if (offline && document.getElementById('appShell').dataset.offlineBoot === '1') {
    document.getElementById('jevChipText').textContent = 'Jev 接続なし';
  }
  if (offline) {
    const pending = loadPendingResults().length;
    const left = offlineDeckCards({ exam: 'all', count: OFFLINE_DECK_SIZE }).length;
    document.getElementById('offlineBannerText').textContent =
      `保存しておいた一問一答（残り${left}問）を解けます。` +
      (pending ? `送信待ちの結果が${pending}回分あり、オンラインに戻ると自動で保存されます。` : '結果は次にオンラインになったときに自動で保存されます。');
  }
}

async function checkJevStatus() {
  const tag = document.getElementById('jevStatusTag');
  const chip = document.getElementById('jevChip');
  const chipText = document.getElementById('jevChipText');
  const statusBox = document.getElementById('keyStatusBox');
  try {
    const data = await api('/api/status');
    STATE.jev = data;
    const fromEnv = data.keySource === 'env';
    const isCloud = data.mode === 'cloud';

    chip.classList.toggle('on', data.jevConfigured);
    chipText.textContent = data.jevConfigured ? 'Jev 有効' : 'Jev 未設定';

    tag.className = `status-indicator-tag${data.jevConfigured ? ' active' : ''}`;
    tag.textContent = data.jevConfigured ? '🟢 Jev 有効' : '⚪ 未設定（ルールで動作中）';

    if (data.jevConfigured) {
      statusBox.innerHTML = `使用中のキー: <code>${escapeHtml(data.maskedKey)}</code>
        <span class="key-source">${fromEnv ? (isCloud ? 'Vercel の環境変数 JEV_API_KEY から読み込み' : '環境変数 JEV_API_KEY から読み込み') : 'この画面で保存したキー'}</span>`;
    } else if (isCloud) {
      statusBox.innerHTML = 'まだキーが設定されていません。下の手順で Vercel の環境変数に登録してください。';
    } else {
      statusBox.innerHTML = 'まだキーが設定されていません。下の欄にキーを貼り付けて「保存して接続テスト」を押してください。';
    }
    statusBox.className = `key-status${data.jevConfigured ? ' on' : ''}`;

    // クラウド版は Vercel の環境変数で管理し、ローカル版は画面から保存できる
    setHidden('keyFormRow', isCloud);
    setHidden('localKeyHelp', isCloud);
    setHidden('cloudKeyHelp', !isCloud);
    setHidden('btnTestJevCloud', !data.jevConfigured);
    document.getElementById('dataLocationText').innerHTML = isCloud
      ? '学習データはあなたのアカウント専用の領域 (Supabase) に保存されています。本人以外は読み書きできません。'
      : '学習データはこのPCの <code>data/store.json</code> に保存されています（APIキーはバックアップに含まれません）。';

    // 環境変数で設定済みの場合は画面から変更できない
    document.getElementById('txtJevKey').disabled = fromEnv;
    document.getElementById('btnSaveJevKey').disabled = fromEnv;
    document.getElementById('btnDeleteJevKey').hidden = data.keySource !== 'saved';
    document.getElementById('btnTestJev').hidden = !data.jevConfigured;
    document.getElementById('txtJevKey').placeholder = data.keySource === 'saved'
      ? '新しいキーに差し替える場合のみ入力'
      : (fromEnv ? '環境変数で設定済み' : 'APIキーを貼り付け');

    setHidden('setupBanner', data.jevConfigured || storageGet(SETUP_DISMISS_KEY) === '1');
    document.getElementById('appVersion').textContent = `${data.appName || 'Jev 学習クエスト'} v${data.version || ''}`;
  } catch (e) {
    tag.textContent = '状態を取得できません';
    chipText.textContent = 'Jev 不明';
  }
}
