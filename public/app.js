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
  mistakeReason: '読み落とし'
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

  const ready = await initAuth();
  if (ready) await startApp();
});

async function startApp() {
  setHidden('authScreen', true);
  setHidden('appShell', false);
  await checkJevStatus();
  await loadRecommendedQuest();
  await updateReviewBadge();
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
  STATE.currentQuest = quest;
  setHidden('questHeroCard', true);
  setHidden('completionBanner', true);
  setHidden('questRunCard', false);

  document.getElementById('runTitle').textContent = quest.title;
  document.getElementById('runCatTag').textContent = categoryName(quest.category);
  document.getElementById('runTypeTag').textContent = quest.type;
  const minutes = quest.recommendedMinutes || STATE.conditions.minutes || 20;

  const promptBox = document.getElementById('runPrompt');
  if (quest.type === '過去問を解く' || quest.type === '誤答を直す') {
    let text = quest.questionText || '過去問の設問に沿って、解説を見ずに答案を作成してください。';
    if (quest.previousMistake) {
      text = `【前回つまずいた点】\n${quest.previousMistake}\n\n【設問】\n${text}`;
    }
    promptBox.textContent = text;
  } else {
    promptBox.textContent = `【やること】\n${quest.nextAction || '実務への影響を整理する'}\n\n【対象】\n${quest.title}\n\n【要点メモ】\n${quest.notes || '公式資料を確認し、実務での活用と次の行動をまとめてください。'}`;
  }

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
    mistakeDetail: document.getElementById('inputMistakeDetail').value.trim()
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

  document.getElementById('completionBanner').scrollIntoView({ behavior: 'smooth' });
}

// --- 5. 復習タブ ---
function isPendingReview(h) {
  return !h.isCorrect && !h.resolved && h.noulNeedsReview !== false;
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
    const pendingCount = (data.history || []).filter(isPendingReview).length;
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
