// 今日の学習クエスト - フロントエンド制御スクリプト

const STATE = {
  activeTab: 'home',
  currentQuest: null,
  allCandidates: [],
  conditions: {
    minutes: 20,
    category: 'all',
    goal: 'balance'
  },
  timer: {
    intervalId: null,
    remainingSeconds: 20 * 60,
    isRunning: false
  },
  isCorrect: true,
  mistakeReason: '読み落とし'
};

const CATEGORY_NAMES = {
  sc: '支援士 (SC)',
  ai: 'AI',
  cloud: 'クラウド',
  security: 'セキュリティ'
};

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initConditionSelectors();
  initTimer();
  initForms();
  initSettings();
  initSubTabs();

  // 初期ステータス取得 & クエスト推薦
  await checkJevStatus();
  await loadRecommendedQuest();
  await refreshDashboardStats();
});

// --- ナビゲーション ---
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-item');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  document.getElementById('btnBackToHome')?.addEventListener('click', () => switchTab('home'));
  document.getElementById('btnGoToRecords')?.addEventListener('click', () => switchTab('records'));
}

function switchTab(tabId) {
  STATE.activeTab = tabId;

  // ナビボタンのハイライト
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });

  // ペインの切り替え
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.remove('active');
  });
  const targetPane = document.getElementById(`tab-${tabId}`);
  if (targetPane) targetPane.classList.add('active');

  // タブに応じた更新
  if (tabId === 'home') {
    refreshDashboardStats();
  } else if (tabId === 'records') {
    loadLearningRecords();
  } else if (tabId === 'register') {
    loadRegisteredItems();
  } else if (tabId === 'settings') {
    checkJevStatus();
  }
}

// --- 条件セレクター制御 ---
function initConditionSelectors() {
  setupButtonGroup('timeSelector', val => {
    STATE.conditions.minutes = parseInt(val, 10);
    loadRecommendedQuest();
  });

  setupButtonGroup('catSelector', val => {
    STATE.conditions.category = val;
    loadRecommendedQuest();
  });

  setupButtonGroup('goalSelector', val => {
    STATE.conditions.goal = val;
    loadRecommendedQuest();
  });

  document.getElementById('btnRefreshRecommend').addEventListener('click', () => {
    loadRecommendedQuest();
  });

  document.getElementById('btnShowCandidates').addEventListener('click', () => {
    openCandidatesModal();
  });

  document.getElementById('btnCloseModal').addEventListener('click', () => {
    document.getElementById('candidatesModal').style.display = 'none';
  });

  document.getElementById('btnStartQuest').addEventListener('click', () => {
    if (STATE.currentQuest) {
      startQuestRun(STATE.currentQuest);
    }
  });
}

function setupButtonGroup(containerId, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const buttons = container.querySelectorAll('.btn-option');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.getAttribute('data-value'));
    });
  });
}

// --- Jev接続状況の確認 ---
async function checkJevStatus() {
  const dot = document.getElementById('jevStatusDot');
  const text = document.getElementById('jevStatusText');
  const bannerIcon = document.getElementById('bannerStatusIcon');
  const bannerTitle = document.getElementById('bannerStatusTitle');
  const bannerDesc = document.getElementById('bannerStatusDesc');

  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    if (data.jevConfigured) {
      dot.className = 'indicator-dot active';
      text.textContent = 'Jev判断: 接続中 (Choice/Score/Noul)';
      if (bannerIcon) bannerIcon.textContent = '🟢';
      if (bannerTitle) bannerTitle.textContent = 'Jev API 接続確立 (環境変数 JEV_API_KEY 設定済)';
      if (bannerDesc) bannerDesc.textContent = 'クエスト選定 (Choice) および理解度・復習判定 (Score/Noul) でJev判断モデルがアクティブです。文章生成は行いません。';
    } else {
      dot.className = 'indicator-dot inactive';
      text.textContent = 'Jev: 未設定 (ルールベース動作)';
      if (bannerIcon) bannerIcon.textContent = '⚪';
      if (bannerTitle) bannerTitle.textContent = 'Jev API キー未設定 (ルールベースで完全動作中)';
      if (bannerDesc) bannerDesc.textContent = '環境変数 JEV_API_KEY が未設定です。アプリ内のルールベース提案エンジンと固定判定ルールで全機能が問題なく動作しています。';
    }
  } catch (err) {
    dot.className = 'indicator-dot inactive';
    text.textContent = 'サーバー通信エラー';
  }
}

// --- クエスト推薦の取得 ---
async function loadRecommendedQuest() {
  const titleEl = document.getElementById('recTitle');
  titleEl.textContent = '最適なクエストを選定中...';

  try {
    const res = await fetch('/api/quest/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(STATE.conditions)
    });
    const data = await res.json();

    if (!data.quest) {
      titleEl.textContent = '利用可能なクエスト候補が見つかりませんでした';
      return;
    }

    STATE.currentQuest = data.quest;
    STATE.currentQuest.decisionSource = data.decisionSource;
    STATE.currentQuest.decisionNote = data.decisionNote;
    STATE.allCandidates = data.allCandidates || [];

    renderRecommendedQuest(data.quest, data.decisionSource, data.decisionNote);
  } catch (err) {
    titleEl.textContent = 'クエスト取得中にエラーが発生しました';
    console.error(err);
  }
}

function renderRecommendedQuest(quest, decisionSource, decisionNote) {
  document.getElementById('recTitle').textContent = quest.title;
  document.getElementById('recCategory').textContent = CATEGORY_NAMES[quest.category] || quest.category.toUpperCase();
  document.getElementById('recType').textContent = quest.type;
  document.getElementById('recTime').textContent = `⏱️ ${quest.recommendedMinutes || STATE.conditions.minutes}分`;
  document.getElementById('recSource').textContent = quest.sourceRef ? `出典 / 参照: ${quest.sourceRef}` : '';
  document.getElementById('recReason').textContent = quest.reason;
  document.getElementById('recCriteria').textContent = quest.criteria;

  const decisionBadge = document.getElementById('recDecisionSource');
  if (decisionSource === 'jev') {
    decisionBadge.className = 'badge badge-decision jev';
    decisionBadge.textContent = '🧠 [Jev判断 (Choice)]';
  } else if (decisionSource === 'rule_fallback') {
    decisionBadge.className = 'badge badge-decision rule';
    decisionBadge.textContent = '🛡️ [ルールベース提案 (Jevフォールバック)]';
  } else {
    decisionBadge.className = 'badge badge-decision rule';
    decisionBadge.textContent = '📋 [ルールベース提案]';
  }
}

// --- 候補選択モーダル ---
function openCandidatesModal() {
  const container = document.getElementById('candidatesListContainer');
  container.innerHTML = '';

  if (STATE.allCandidates.length === 0) {
    container.innerHTML = '<p class="text-muted">候補がありません</p>';
  } else {
    STATE.allCandidates.forEach(cand => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'candidate-item';
      itemDiv.innerHTML = `
        <div class="card-badge-row" style="margin-bottom:6px;">
          <span class="badge badge-category">${CATEGORY_NAMES[cand.category] || cand.category}</span>
          <span class="badge badge-type">${cand.type}</span>
          <span class="badge badge-time">⏱️ ${cand.recommendedMinutes || 20}分</span>
        </div>
        <h4>${escapeHtml(cand.title)}</h4>
        <p>${escapeHtml(cand.reason)}</p>
      `;
      itemDiv.addEventListener('click', () => {
        STATE.currentQuest = cand;
        STATE.currentQuest.decisionSource = 'manual';
        STATE.currentQuest.decisionNote = 'ユーザーが候補一覧から手動で選択しました。';
        renderRecommendedQuest(cand, 'manual', STATE.currentQuest.decisionNote);
        document.getElementById('candidatesModal').style.display = 'none';
      });
      container.appendChild(itemDiv);
    });
  }

  document.getElementById('candidatesModal').style.display = 'flex';
}

// --- クエスト実行開始 ---
function startQuestRun(quest) {
  // 画面のセットアップ
  document.getElementById('runTitle').textContent = quest.title;
  document.getElementById('runCategory').textContent = CATEGORY_NAMES[quest.category] || quest.category;
  document.getElementById('runType').textContent = quest.type;
  document.getElementById('runSourceRef').textContent = quest.sourceRef ? `出典: ${quest.sourceRef}` : '';

  // 設問文・作業内容（※解説は事前に表示しない）
  const promptBox = document.getElementById('runQuestionText');
  if (quest.type === '過去問を解く' || quest.type === '誤答を直す') {
    promptBox.textContent = quest.questionText || '過去問の設問に沿って、解説を見ずに答案を作成してください。';
    if (quest.previousMistake) {
      promptBox.textContent = `【克服すべき前回の弱点】\n${quest.previousMistake}\n\n【設問文】\n` + (quest.questionText || '前回の設問に対して解説を見ずに再解答してください。');
    }
  } else {
    promptBox.textContent = `【作業内容】\n${quest.title}\n\n【次の行動】\n${quest.nextAction || '実務への影響整理'}\n\n【メモ】\n${quest.notes || '公式ドキュメントや発表資料を確認し、要点と次の行動を完了してください。'}`;
  }

  document.getElementById('runCriteria').textContent = quest.criteria;

  const runDecision = document.getElementById('runDecisionSource');
  if (quest.decisionSource === 'jev') {
    runDecision.className = 'badge badge-decision jev';
    runDecision.textContent = 'Jev選定';
  } else {
    runDecision.className = 'badge badge-decision rule';
    runDecision.textContent = quest.decisionSource === 'manual' ? '手動選択' : 'ルール選定';
  }

  // フォームリセット
  document.getElementById('runUserAnswer').value = '';
  document.getElementById('runMistakeDetail').value = '';
  document.getElementById('runGeneralNotes').value = '';
  document.getElementById('runFormCard').style.display = 'block';
  document.getElementById('completionCard').style.display = 'none';

  // 正解/誤答セレクター初期化
  setCorrectState(true);

  // タイマー初期化
  const minutes = quest.recommendedMinutes || STATE.conditions.minutes || 20;
  resetTimer(minutes);

  // クエスト実行中ドット表示
  document.getElementById('activeQuestDot').style.display = 'inline-block';

  // クエスト実行タブへ遷移
  switchTab('quest-run');
}

// --- タイマー ---
function initTimer() {
  const toggleBtn = document.getElementById('btnTimerToggle');
  const resetBtn = document.getElementById('btnTimerReset');

  toggleBtn.addEventListener('click', toggleTimer);
  resetBtn.addEventListener('click', () => {
    const min = STATE.currentQuest?.recommendedMinutes || STATE.conditions.minutes || 20;
    resetTimer(min);
  });
}

function updateTimerDisplay() {
  const m = Math.floor(STATE.timer.remainingSeconds / 60);
  const s = STATE.timer.remainingSeconds % 60;
  document.getElementById('timerDisplay').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function toggleTimer() {
  const toggleBtn = document.getElementById('btnTimerToggle');
  if (STATE.timer.isRunning) {
    clearInterval(STATE.timer.intervalId);
    STATE.timer.isRunning = false;
    toggleBtn.textContent = '▶';
  } else {
    STATE.timer.isRunning = true;
    toggleBtn.textContent = '⏸';
    STATE.timer.intervalId = setInterval(() => {
      if (STATE.timer.remainingSeconds > 0) {
        STATE.timer.remainingSeconds--;
        updateTimerDisplay();
      } else {
        clearInterval(STATE.timer.intervalId);
        STATE.timer.isRunning = false;
        toggleBtn.textContent = '▶';
        alert('⏱️ クエストの所要時間が終了しました。結果と気付きを記録しましょう！');
      }
    }, 1000);
  }
}

function resetTimer(minutes) {
  clearInterval(STATE.timer.intervalId);
  STATE.timer.isRunning = false;
  STATE.timer.remainingSeconds = minutes * 60;
  document.getElementById('btnTimerToggle').textContent = '▶';
  updateTimerDisplay();
}

// --- 正誤・誤答原因セレクター ---
function initForms() {
  // 正解 / 誤答 切り替え
  setupButtonGroup('isCorrectSelector', val => {
    setCorrectState(val === 'true');
  });

  // 誤答原因セレクター
  setupButtonGroup('mistakeReasonSelector', val => {
    STATE.mistakeReason = val;
  });

  // クエスト完了送信
  document.getElementById('btnFinishQuest').addEventListener('click', handleFinishQuest);

  // 支援士 過去問登録フォーム
  const formSC = document.getElementById('formRegisterSC');
  formSC.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      type: 'sc_past_paper',
      category: 'sc',
      title: document.getElementById('scTitle').value,
      source: document.getElementById('scSource').value,
      publishedDate: document.getElementById('scDate').value,
      questionText: document.getElementById('scQuestionText').value,
      notes: document.getElementById('scNotes').value,
      nextAction: '既存知識と比較する',
      practicalValue: 'high',
      needsReview: true
    };

    await registerItem(payload, formSC);
  });

  // 技術キャッチアップ登録フォーム
  const formCU = document.getElementById('formRegisterCatchup');
  formCU.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      type: 'catchup',
      category: document.getElementById('cuCategory').value,
      title: document.getElementById('cuTitle').value,
      source: document.getElementById('cuSource').value,
      url: document.getElementById('cuUrl').value,
      publishedDate: document.getElementById('cuDate').value,
      practicalValue: document.getElementById('cuPracticalValue').value,
      nextAction: document.getElementById('cuNextAction').value,
      notes: document.getElementById('cuNotes').value,
      needsReview: false
    };

    await registerItem(payload, formCU);
  });
}

function setCorrectState(isCorrect) {
  STATE.isCorrect = isCorrect;
  const mistakeSection = document.getElementById('mistakeSection');
  if (mistakeSection) {
    mistakeSection.style.display = isCorrect ? 'none' : 'block';
  }
}

async function handleFinishQuest() {
  if (!STATE.currentQuest) return;

  const userAnswer = document.getElementById('runUserAnswer').value.trim();
  if (!userAnswer) {
    alert('答案または作業気付きメモを入力してください。');
    return;
  }

  const payload = {
    itemId: STATE.currentQuest.itemId || null,
    category: STATE.currentQuest.category,
    questType: STATE.currentQuest.type,
    title: STATE.currentQuest.title,
    minutes: STATE.currentQuest.recommendedMinutes || STATE.conditions.minutes,
    reason: STATE.currentQuest.reason,
    criteria: STATE.currentQuest.criteria,
    decisionSource: STATE.currentQuest.decisionSource,
    userAnswer: userAnswer,
    isCorrect: STATE.isCorrect,
    mistakeReason: STATE.isCorrect ? '' : STATE.mistakeReason,
    mistakeDetail: document.getElementById('runMistakeDetail').value.trim(),
    notes: document.getElementById('runGeneralNotes').value.trim()
  };

  try {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!data.success) {
      alert('保存に失敗しました');
      return;
    }

    // タイマーストップ & ドット非表示
    clearInterval(STATE.timer.intervalId);
    STATE.timer.isRunning = false;
    document.getElementById('activeQuestDot').style.display = 'none';

    // 完了カードの表示
    document.getElementById('runFormCard').style.display = 'none';
    const compCard = document.getElementById('completionCard');
    compCard.style.display = 'block';

    const evalData = data.evaluation || {};
    const scoreDescriptions = ['-', '1 (基礎知識不足)', '2 (要復習)', '3 (概ね理解)', '4 (完璧に理解)'];
    document.getElementById('evalScoreText').textContent = scoreDescriptions[evalData.understandingScore] || `${evalData.understandingScore} / 4`;
    document.getElementById('evalNoulText').textContent = evalData.needsReview ? '⚠️ 復習・再挑戦が必要' : '✨ 復習不要 (習得済み)';

    const sourceBadge = document.getElementById('evalSourceBadge');
    if (evalData.decisionSource === 'jev') {
      sourceBadge.className = 'badge badge-decision jev';
      sourceBadge.textContent = 'Jev Score & Noul';
    } else {
      sourceBadge.className = 'badge badge-decision rule';
      sourceBadge.textContent = 'ルールベース評価';
    }

    const comment = evalData.needsReview
      ? (STATE.isCorrect
          ? '正解しましたが、知識の定着を確実にするため数日後に復習クエストが組まれます。'
          : `誤答原因【${STATE.mistakeReason}】を記録しました。数日後に解説を隠して再挑戦クエストを提案します。`)
      : '十分に理解できています。次の新しいテーマに進みましょう！';
    document.getElementById('evalComment').textContent = comment;

    // ダッシュボード更新
    refreshDashboardStats();
  } catch (err) {
    alert('保存処理中にエラーが発生しました');
    console.error(err);
  }
}

// --- アイテム登録 ---
async function registerItem(payload, formEl) {
  try {
    const res = await fetch('/api/registered-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('学習素材を登録しました！ 今後のクエスト推薦候補に含まれます。');
      formEl.reset();
      loadRegisteredItems();
      loadRecommendedQuest();
      refreshDashboardStats();
    } else {
      alert(data.error || '登録に失敗しました');
    }
  } catch (err) {
    alert('通信エラーが発生しました');
  }
}

// --- 登録アイテム一覧表示 ---
async function loadRegisteredItems() {
  const container = document.getElementById('registeredItemsList');
  try {
    const res = await fetch('/api/registered-items');
    const data = await res.json();
    const items = data.items || [];

    if (items.length === 0) {
      container.innerHTML = '<p class="text-muted">登録された素材はありません。</p>';
      return;
    }

    container.innerHTML = items.map(item => {
      const sampleBadge = item.isSample ? '<span class="badge" style="background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44;">架空サンプル</span>' : '';
      const actionBadge = item.nextAction ? `<span class="next-action-tag">次: ${escapeHtml(item.nextAction)}</span>` : '';
      return `
        <div class="item-row">
          <div class="item-title-col">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span class="badge badge-category">${CATEGORY_NAMES[item.category] || item.category}</span>
              ${sampleBadge}
              ${actionBadge}
            </div>
            <h5>${escapeHtml(item.title)}</h5>
            <div class="item-meta">
              <span>出典: ${escapeHtml(item.source || 'なし')}</span>
              ${item.url ? `<span><a href="${item.url}" target="_blank" style="color:#60a5fa;text-decoration:none;">URL↗</a></span>` : ''}
              <span>登録日: ${item.createdAt ? item.createdAt.slice(0, 10) : '-'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p class="text-muted">一覧取得失敗</p>';
  }
}

// --- 学習記録 & 弱点分析画面 ---
async function loadLearningRecords() {
  const pendingContainer = document.getElementById('pendingReviewList');
  const mistakeGrid = document.getElementById('mistakeAnalysisGrid');
  const historyTable = document.getElementById('historyTableBody');
  const filterCat = document.getElementById('historyFilterCategory').value;

  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    const history = data.history || [];

    // 1. 再挑戦待ちリストの抽出 (誤答かつ復習フラグあり)
    const pending = history.filter(h => !h.isCorrect && h.noulNeedsReview);
    document.getElementById('pendingCountBadge').textContent = `${pending.length}件`;

    if (pending.length === 0) {
      pendingContainer.innerHTML = '<p style="color:#94a3b8;font-size:13px;padding:8px 0;">現在、再挑戦待ちの弱点はありません。順調です！✨</p>';
    } else {
      pendingContainer.innerHTML = pending.map(h => `
        <div class="pending-item">
          <div class="pending-item-info">
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">
              <span class="badge badge-category">${CATEGORY_NAMES[h.category] || h.category}</span>
              <span class="mistake-tag">弱点原因: ${escapeHtml(h.mistakeReason || '誤答')}</span>
            </div>
            <h4>${escapeHtml(h.title)}</h4>
            <div class="pending-item-meta">
              <span>前回演習: ${h.completedAt ? h.completedAt.slice(0, 10) : '-'}</span>
              <span>詳細: ${escapeHtml(h.mistakeDetail || 'なし')}</span>
            </div>
          </div>
          <button class="btn btn-secondary btn-retry-quest" data-histid="${h.id}">解説なしで再挑戦 🚀</button>
        </div>
      `).join('');

      // 再挑戦ボタンイベント設定
      pendingContainer.querySelectorAll('.btn-retry-quest').forEach(btn => {
        btn.addEventListener('click', () => {
          const histId = btn.getAttribute('data-histid');
          const targetHist = history.find(h => h.id === histId);
          if (targetHist) {
            startQuestRun({
              type: '誤答を直す',
              category: targetHist.category,
              title: `【再挑戦】${targetHist.title}の弱点克服`,
              sourceRef: '前回の誤答記録',
              questionText: targetHist.userAnswer ? `【前回のあなたの答案】\n${targetHist.userAnswer}\n\n前回の誤答原因「${targetHist.mistakeReason}」を踏まえ、解説を見ずに正しい答案を作成してください。` : '',
              previousMistake: `${targetHist.mistakeReason}: ${targetHist.mistakeDetail || ''}`,
              recommendedMinutes: 20,
              reason: '前回の誤答原因を克服するため、解説を見ずに再挑戦します。',
              criteria: '前回の誤答箇所を修正し、設問要求を満たす正確な記述または解答ができること。',
              itemId: targetHist.itemId,
              decisionSource: 'manual'
            });
          }
        });
      });
    }

    // 2. 誤答原因の集計
    const mistakeCounts = {
      '読み落とし': 0,
      '知識不足': 0,
      '設問要求とのずれ': 0,
      '時間不足': 0
    };
    history.forEach(h => {
      if (!h.isCorrect && h.mistakeReason && mistakeCounts[h.mistakeReason] !== undefined) {
        mistakeCounts[h.mistakeReason]++;
      }
    });

    mistakeGrid.innerHTML = Object.entries(mistakeCounts).map(([name, count]) => `
      <div class="mistake-stat-box">
        <span class="mistake-stat-name">${name}</span>
        <span class="mistake-stat-count">${count}回</span>
      </div>
    `).join('');

    // 3. 全履歴一覧テーブル
    const filteredHistory = filterCat === 'all' ? history : history.filter(h => h.category === filterCat);
    if (filteredHistory.length === 0) {
      historyTable.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#94a3b8;">履歴がありません</td></tr>';
    } else {
      historyTable.innerHTML = filteredHistory.map(h => {
        const isCor = h.isCorrect ? '<span style="color:#10b981;font-weight:700;">⭕ 正解</span>' : `<span style="color:#ef4444;font-weight:700;">❌ ${escapeHtml(h.mistakeReason || '誤答')}</span>`;
        const decBadge = h.decisionSource === 'jev'
          ? '<span class="badge badge-decision jev">Jev</span>'
          : '<span class="badge badge-decision rule">ルール</span>';
        const nextRev = h.nextReviewDate ? h.nextReviewDate.slice(5, 10) : '-';
        return `
          <tr>
            <td>${h.completedAt ? h.completedAt.slice(5, 16).replace('T', ' ') : '-'}</td>
            <td><span class="badge badge-category">${CATEGORY_NAMES[h.category] || h.category}</span></td>
            <td>${escapeHtml(h.questType || '-')}</td>
            <td><strong>${escapeHtml(h.title)}</strong></td>
            <td>${h.minutes}分</td>
            <td>${isCor}</td>
            <td>${decBadge}</td>
            <td>${nextRev}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

// 履歴フィルター切り替え
document.getElementById('historyFilterCategory')?.addEventListener('change', loadLearningRecords);

// --- ダッシュボード統計 ---
async function refreshDashboardStats() {
  try {
    const resH = await fetch('/api/history');
    const dataH = await resH.json();
    const history = dataH.history || [];

    const resI = await fetch('/api/registered-items');
    const dataI = await resI.json();
    const items = dataI.items || [];

    // 今週完了数 (直近7日)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const completedThisWeek = history.filter(h => new Date(h.completedAt) >= sevenDaysAgo).length;

    // 再挑戦待ち
    const pendingCount = history.filter(h => !h.isCorrect && h.noulNeedsReview).length;

    document.getElementById('statCompletedTotal').textContent = completedThisWeek;
    document.getElementById('statPendingReviews').textContent = pendingCount;
    document.getElementById('statRegisteredItems').textContent = items.length;

    // サンプルバッジ
    const hasSample = items.some(i => i.isSample) || history.some(h => h.isSample);
    const sampleBadge = document.getElementById('sampleNoticeBadge');
    if (sampleBadge) {
      sampleBadge.style.display = hasSample ? 'inline-block' : 'none';
      sampleBadge.innerHTML = hasSample ? '<span>🏷️ 架空サンプル読込中</span>' : '<span>✅ 実データのみ</span>';
    }
  } catch (err) {
    console.error(err);
  }
}

// --- 情報登録サブタブ ---
function initSubTabs() {
  const subtabs = document.querySelectorAll('.subtab-btn');
  subtabs.forEach(btn => {
    btn.addEventListener('click', () => {
      subtabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetId = btn.getAttribute('data-subtab');
      document.getElementById('formRegisterSC').classList.toggle('active', targetId === 'reg-sc');
      document.getElementById('formRegisterCatchup').classList.toggle('active', targetId === 'reg-catchup');
    });
  });
}

// --- 設定・バックアップ管理 ---
function initSettings() {
  // サンプル再投入
  document.getElementById('btnAddSamples').addEventListener('click', async () => {
    if (!confirm('架空のサンプルデータを追加しますか？')) return;
    await sendSeedAction('add_samples');
  });

  // サンプル全削除
  document.getElementById('btnClearSamples').addEventListener('click', async () => {
    if (!confirm('架空のサンプルデータのみを全て削除しますか？（ご自身で登録した実データは残ります）')) return;
    await sendSeedAction('clear_samples');
  });

  // 全初期化
  document.getElementById('btnResetAll').addEventListener('click', async () => {
    if (!confirm('データを初期状態にリセットしますか？')) return;
    await sendSeedAction('reset_all');
  });

  // エクスポート
  document.getElementById('btnExportData').addEventListener('click', () => {
    window.location.href = '/api/backup';
  });

  // インポート
  const fileInput = document.getElementById('fileImportData');
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const jsonData = JSON.parse(ev.target.result);
        const res = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonData)
        });
        const result = await res.json();
        if (result.success) {
          alert('バックアップデータを正常に復元しました！');
          refreshDashboardStats();
          loadRecommendedQuest();
        } else {
          alert(result.error || '復元に失敗しました');
        }
      } catch (err) {
        alert('無効なJSONファイルです');
      }
    };
    reader.readAsText(file);
  });
}

async function sendSeedAction(action) {
  try {
    const res = await fetch('/api/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    alert(data.message || '完了しました');
    refreshDashboardStats();
    loadRecommendedQuest();
    loadRegisteredItems();
  } catch (err) {
    alert('通信エラー');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
