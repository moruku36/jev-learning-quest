// 今日の学習クエスト - シンプル版フロントエンドロジック

const STATE = {
  activeTab: 'quest',
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
  sc: '支援士',
  ai: 'AI',
  cloud: 'クラウド',
  security: 'セキュリティ'
};

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initFilterPills();
  initHeroActions();
  initRunMode();
  initSettingsAndForms();

  // 初期データ読み込み
  await checkJevStatus();
  await loadRecommendedQuest();
  await updateReviewBadge();
});

// --- 1. タブナビゲーション ---
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      switchTab(target);
    });
  });
}

function switchTab(tabName) {
  STATE.activeTab = tabName;
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.view-panel').forEach(p => {
    p.classList.remove('active');
  });
  const targetView = document.getElementById(`view-${tabName}`);
  if (targetView) targetView.classList.add('active');

  if (tabName === 'review') {
    loadReviewList();
  } else if (tabName === 'settings') {
    checkJevStatus();
  } else if (tabName === 'quest') {
    updateReviewBadge();
  }
}

// --- 2. ピル選択 (時間 & 分野) ---
function initFilterPills() {
  setupPills('timePills', val => {
    STATE.conditions.minutes = parseInt(val, 10);
    loadRecommendedQuest();
  });

  setupPills('catPills', val => {
    STATE.conditions.category = val;
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

// --- 3. クエスト推薦と表示 ---
async function loadRecommendedQuest() {
  const titleEl = document.getElementById('heroTitle');
  titleEl.textContent = '最適なクエストを選定中...';

  try {
    const res = await fetch('/api/quest/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(STATE.conditions)
    });
    const data = await res.json();

    if (!data.quest) {
      titleEl.textContent = '候補が見つかりませんでした。';
      return;
    }

    STATE.currentQuest = data.quest;
    STATE.currentQuest.decisionSource = data.decisionSource;
    STATE.allCandidates = data.allCandidates || [];

    renderHeroQuest(data.quest, data.decisionSource);
  } catch (err) {
    titleEl.textContent = 'クエストの取得に失敗しました';
  }
}

function renderHeroQuest(quest, decisionSource) {
  document.getElementById('heroTitle').textContent = quest.title;
  document.getElementById('heroCategory').textContent = CATEGORY_NAMES[quest.category] || quest.category.toUpperCase();
  document.getElementById('heroType').textContent = quest.type;
  document.getElementById('heroTime').textContent = `⏱️ ${quest.recommendedMinutes || STATE.conditions.minutes}分`;
  document.getElementById('heroSource').textContent = quest.sourceRef ? `出典: ${quest.sourceRef}` : '';
  document.getElementById('heroReason').textContent = quest.reason;
  document.getElementById('heroCriteria').textContent = quest.criteria;

  const sourceTag = document.getElementById('heroDecisionSource');
  if (decisionSource === 'jev') {
    sourceTag.className = 'tag tag-source';
    sourceTag.textContent = '🧠 Jev AI選定';
  } else {
    sourceTag.className = 'tag tag-source rule';
    sourceTag.textContent = '📋 ルール自動選定';
  }

  // 実行カードと完了バナーを隠し、ヒーローカードを表示
  document.getElementById('questHeroCard').style.display = 'block';
  document.getElementById('questRunCard').style.display = 'none';
  document.getElementById('completionBanner').style.display = 'none';
}

// --- 4. クエスト実行モード ---
function initHeroActions() {
  document.getElementById('btnStartHero').addEventListener('click', () => {
    if (STATE.currentQuest) startQuestRun(STATE.currentQuest);
  });

  document.getElementById('btnChangeQuest').addEventListener('click', openCandidatesModal);
  document.getElementById('btnCloseQuestList').addEventListener('click', () => {
    document.getElementById('questListModal').style.display = 'none';
  });

  document.getElementById('btnCompNext').addEventListener('click', () => {
    loadRecommendedQuest();
  });
}

function openCandidatesModal() {
  const container = document.getElementById('questListBody');
  container.innerHTML = '';

  if (STATE.allCandidates.length === 0) {
    container.innerHTML = '<p class="text-muted">ほかの候補がありません</p>';
  } else {
    STATE.allCandidates.forEach(cand => {
      const item = document.createElement('div');
      item.className = 'modal-item';
      item.innerHTML = `
        <div style="display:flex;gap:6px;margin-bottom:4px;">
          <span class="tag tag-cat">${CATEGORY_NAMES[cand.category] || cand.category}</span>
          <span class="tag tag-type">${cand.type}</span>
          <span class="tag tag-time">${cand.recommendedMinutes || 20}分</span>
        </div>
        <h4>${escapeHtml(cand.title)}</h4>
        <p>${escapeHtml(cand.reason)}</p>
      `;
      item.addEventListener('click', () => {
        STATE.currentQuest = cand;
        STATE.currentQuest.decisionSource = 'manual';
        renderHeroQuest(cand, 'manual');
        document.getElementById('questListModal').style.display = 'none';
      });
      container.appendChild(item);
    });
  }

  document.getElementById('questListModal').style.display = 'flex';
}

function startQuestRun(quest) {
  // ヒーローカードを隠し、実行カードを展開
  document.getElementById('questHeroCard').style.display = 'none';
  document.getElementById('completionBanner').style.display = 'none';
  const runCard = document.getElementById('questRunCard');
  runCard.style.display = 'block';

  document.getElementById('runTitle').textContent = quest.title;
  document.getElementById('runCatTag').textContent = CATEGORY_NAMES[quest.category] || quest.category;
  const minutes = quest.recommendedMinutes || STATE.conditions.minutes || 20;
  document.getElementById('runTimeTag').textContent = `${minutes}分`;

  // 設問文（解説なし）
  const promptBox = document.getElementById('runPrompt');
  if (quest.type === '過去問を解く' || quest.type === '誤答を直す') {
    promptBox.textContent = quest.questionText || '過去問の設問に沿って、解説を見ずに答案を作成してください。';
    if (quest.previousMistake) {
      promptBox.textContent = `【前回誤答した弱点】\n${quest.previousMistake}\n\n【設問文】\n` + (quest.questionText || '前回の設問に対して解説を見ずに再解答してください。');
    }
  } else {
    promptBox.textContent = `【作業内容】\n${quest.title}\n\n【次の行動】\n${quest.nextAction || '実務への影響整理'}\n\n【要点】\n${quest.notes || '公式資料を確認し、実務での活用と次の行動を完了してください。'}`;
  }

  // 入力リセット
  document.getElementById('inputAnswer').value = '';
  document.getElementById('inputMistakeDetail').value = '';

  // 採点初期化 (正解)
  setEvalState(true);

  // タイマースタート
  startTimer(minutes);

  // スクロール
  runCard.scrollIntoView({ behavior: 'smooth' });
}

function initRunMode() {
  // タイマー操作
  document.getElementById('btnTimerPlayPause').addEventListener('click', toggleTimer);

  // 中断
  document.getElementById('btnCancelRun').addEventListener('click', () => {
    if (confirm('クエストを中断して戻りますか？')) {
      stopTimer();
      document.getElementById('questRunCard').style.display = 'none';
      document.getElementById('questHeroCard').style.display = 'block';
    }
  });

  // 採点ピル
  setupPills('evalPills', val => {
    setEvalState(val === 'true');
  });

  // 誤答原因ピル
  setupPills('mistakePills', val => {
    STATE.mistakeReason = val;
  });

  // 完了ボタン
  document.getElementById('btnCompleteQuest').addEventListener('click', handleCompleteQuest);
}

function setEvalState(isCorrect) {
  STATE.isCorrect = isCorrect;
  document.getElementById('mistakeDrawer').style.display = isCorrect ? 'none' : 'block';
}

function startTimer(minutes) {
  stopTimer();
  STATE.timer.remainingSeconds = minutes * 60;
  STATE.timer.isRunning = true;
  document.getElementById('btnTimerPlayPause').textContent = '⏸';
  updateTimerText();

  STATE.timer.intervalId = setInterval(() => {
    if (STATE.timer.remainingSeconds > 0) {
      STATE.timer.remainingSeconds--;
      updateTimerText();
    } else {
      stopTimer();
      alert('⏱️ 所要時間が終了しました！ 答案・メモと結果を記録しましょう。');
    }
  }, 1000);
}

function toggleTimer() {
  const btn = document.getElementById('btnTimerPlayPause');
  if (STATE.timer.isRunning) {
    clearInterval(STATE.timer.intervalId);
    STATE.timer.isRunning = false;
    btn.textContent = '▶';
  } else {
    STATE.timer.isRunning = true;
    btn.textContent = '⏸';
    STATE.timer.intervalId = setInterval(() => {
      if (STATE.timer.remainingSeconds > 0) {
        STATE.timer.remainingSeconds--;
        updateTimerText();
      } else {
        stopTimer();
      }
    }, 1000);
  }
}

function stopTimer() {
  clearInterval(STATE.timer.intervalId);
  STATE.timer.isRunning = false;
  document.getElementById('btnTimerPlayPause').textContent = '▶';
}

function updateTimerText() {
  const m = Math.floor(STATE.timer.remainingSeconds / 60);
  const s = STATE.timer.remainingSeconds % 60;
  document.getElementById('timerClock').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function handleCompleteQuest() {
  const ans = document.getElementById('inputAnswer').value.trim();
  if (!ans) {
    alert('答案または作業メモを入力してください。');
    return;
  }

  stopTimer();

  const payload = {
    itemId: STATE.currentQuest.itemId || null,
    category: STATE.currentQuest.category,
    questType: STATE.currentQuest.type,
    title: STATE.currentQuest.title,
    minutes: STATE.currentQuest.recommendedMinutes || STATE.conditions.minutes,
    reason: STATE.currentQuest.reason,
    criteria: STATE.currentQuest.criteria,
    decisionSource: STATE.currentQuest.decisionSource,
    userAnswer: ans,
    isCorrect: STATE.isCorrect,
    mistakeReason: STATE.isCorrect ? '' : STATE.mistakeReason,
    mistakeDetail: document.getElementById('inputMistakeDetail').value.trim()
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

    // 実行カードを隠し、完了バナーを表示
    document.getElementById('questRunCard').style.display = 'none';
    const banner = document.getElementById('completionBanner');
    banner.style.display = 'block';

    const ev = data.evaluation || {};
    const scoreMap = ['-', '基礎不足', '要復習', '概ね理解', '完璧'];
    document.getElementById('compScoreTag').textContent = `理解度(Score): ${scoreMap[ev.understandingScore] || ev.understandingScore}`;
    document.getElementById('compReviewTag').textContent = ev.needsReview ? '復習(Noul): ⚠️数日後に再挑戦' : '復習(Noul): ✨習得済み';
    document.getElementById('compSourceTag').textContent = ev.decisionSource === 'jev' ? '判定: Jev AI' : '判定: ルール';

    const msg = ev.needsReview
      ? (STATE.isCorrect
          ? '正解しましたが、定着のため数日後に復習クエストが組まれます。'
          : `誤答原因【${STATE.mistakeReason}】を記録しました。「弱点・復習」リストからいつでも再挑戦できます。`)
      : '十分に理解できています。この調子で進めましょう！';
    document.getElementById('compMessage').textContent = msg;

    updateReviewBadge();
  } catch (err) {
    alert('保存処理エラー');
  }
}

// --- 5. 弱点・復習タブ ---
async function loadReviewList() {
  const container = document.getElementById('reviewItemsContainer');
  const countsRow = document.getElementById('mistakeCountsRow');
  container.innerHTML = '<p class="text-muted">読み込み中...</p>';

  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    const history = data.history || [];

    const pending = history.filter(h => !h.isCorrect && h.noulNeedsReview);

    if (pending.length === 0) {
      container.innerHTML = '<div class="card" style="padding:20px;text-align:center;color:#10b981;">🎉 現在、再挑戦待ちの弱点はありません！</div>';
    } else {
      container.innerHTML = pending.map(h => `
        <div class="review-item-card">
          <div class="review-item-main">
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">
              <span class="tag tag-cat">${CATEGORY_NAMES[h.category] || h.category}</span>
              <span class="mistake-badge">原因: ${escapeHtml(h.mistakeReason || '誤答')}</span>
            </div>
            <h4>${escapeHtml(h.title)}</h4>
            <div class="review-item-meta">
              <span>詳細: ${escapeHtml(h.mistakeDetail || 'なし')}</span>
              <span>演習日: ${h.completedAt ? h.completedAt.slice(0, 10) : '-'}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm btn-re-try" data-hid="${h.id}">解説なしで再挑戦 🚀</button>
        </div>
      `).join('');

      container.querySelectorAll('.btn-re-try').forEach(btn => {
        btn.addEventListener('click', () => {
          const hid = btn.getAttribute('data-hid');
          const target = history.find(item => item.id === hid);
          if (target) {
            switchTab('quest');
            startQuestRun({
              type: '誤答を直す',
              category: target.category,
              title: `【再挑戦】${target.title}の弱点克服`,
              sourceRef: '前回の誤答記録',
              questionText: target.userAnswer ? `【前回のあなたの答案】\n${target.userAnswer}\n\n前回の誤答原因「${target.mistakeReason}」を踏まえ、解説を見ずに正しい答案を作成してください。` : '',
              previousMistake: `${target.mistakeReason}: ${target.mistakeDetail || ''}`,
              recommendedMinutes: 20,
              reason: '前回の誤答原因を克服するため、解説を見ずに再挑戦します。',
              criteria: '前回の誤答箇所を修正し、設問要求を満たす正確な解答ができること。',
              itemId: target.itemId,
              decisionSource: 'manual'
            });
          }
        });
      });
    }

    // 誤答原因の集計
    const counts = { '読み落とし': 0, '知識不足': 0, '設問要求とのずれ': 0, '時間不足': 0 };
    history.forEach(h => {
      if (!h.isCorrect && h.mistakeReason && counts[h.mistakeReason] !== undefined) {
        counts[h.mistakeReason]++;
      }
    });

    countsRow.innerHTML = Object.entries(counts).map(([name, count]) => `
      <div class="mistake-count-box">
        <div class="mistake-name">${name}</div>
        <div class="mistake-num">${count}回</div>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = '<p class="text-muted">取得に失敗しました</p>';
  }
}

async function updateReviewBadge() {
  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    const history = data.history || [];
    const pendingCount = history.filter(h => !h.isCorrect && h.noulNeedsReview).length;
    const badge = document.getElementById('reviewCountBadge');
    if (pendingCount > 0) {
      badge.textContent = pendingCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch (e) {}
}

// --- 6. 設定 & Jev接続 & 素材登録 ---
function initSettingsAndForms() {
  // Jevキー保存
  document.getElementById('btnSaveJevKey').addEventListener('click', async () => {
    const key = document.getElementById('txtJevKey').value;
    try {
      const res = await fetch('/api/settings/jev-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await res.json();
      alert(data.message || '更新しました');
      checkJevStatus();
    } catch (e) {
      alert('保存に失敗しました');
    }
  });

  // Jev接続テスト
  document.getElementById('btnTestJev').addEventListener('click', async () => {
    const key = document.getElementById('txtJevKey').value;
    const resultBox = document.getElementById('jevTestResult');
    resultBox.style.display = 'block';
    resultBox.className = 'jev-test-result';
    resultBox.textContent = 'Jev API (POST https://api.typesafe.ai/v1/systemone) へ接続確認中...';

    try {
      const res = await fetch('/api/settings/test-jev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await res.json();

      if (data.success) {
        resultBox.className = 'jev-test-result success';
        resultBox.innerHTML = `✅ <strong>Jev API 接続成功！</strong> (応答時間: ${data.elapsedMs}ms)<br>Jev判断モデルが正常に応答しました。今後のクエスト選定(Choice)と評価(Score/Noul)に適用されます。`;
        checkJevStatus();
      } else {
        resultBox.className = 'jev-test-result error';
        resultBox.innerHTML = `⚠️ <strong>接続失敗:</strong> ${escapeHtml(data.error || '通信エラー')}<br><small style="color:#cbd5e1;">※キーが無効・エラーの場合でも、アプリは安全なルールベース判断に自動フォールバックして問題なく使えます。</small>`;
      }
    } catch (err) {
      resultBox.className = 'jev-test-result error';
      resultBox.textContent = `通信エラー: ${err.message}`;
    }
  });

  // サブタブ切り替え (素材登録)
  document.querySelectorAll('.subtab').forEach(st => {
    st.addEventListener('click', () => {
      document.querySelectorAll('.subtab').forEach(b => b.classList.remove('active'));
      st.classList.add('active');
      const target = st.getAttribute('data-sub');
      document.getElementById('formSimpleSC').classList.toggle('active', target === 'sub-sc');
      document.getElementById('formSimpleCU').classList.toggle('active', target === 'sub-cu');
    });
  });

  // 支援士登録
  document.getElementById('formSimpleSC').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      type: 'sc_past_paper',
      category: 'sc',
      title: document.getElementById('inScTitle').value.trim(),
      source: document.getElementById('inScSource').value.trim(),
      publishedDate: document.getElementById('inScDate').value,
      questionText: document.getElementById('inScQuestion').value.trim(),
      notes: document.getElementById('inScNotes').value.trim(),
      nextAction: '既存知識と比較する'
    };
    await postItem(payload, e.target);
  });

  // キャッチアップ登録
  document.getElementById('formSimpleCU').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      type: 'catchup',
      category: document.getElementById('inCuCat').value,
      title: document.getElementById('inCuTitle').value.trim(),
      source: document.getElementById('inCuSource').value.trim(),
      nextAction: document.getElementById('inCuAction').value,
      notes: document.getElementById('inCuNotes').value.trim()
    };
    await postItem(payload, e.target);
  });

  // バックアップ
  document.getElementById('btnExportJson').addEventListener('click', () => {
    window.location.href = '/api/backup';
  });

  // サンプル削除
  document.getElementById('btnResetSamples').addEventListener('click', async () => {
    if (!confirm('架空のサンプルデータを削除しますか？（ご自身の登録データは残ります）')) return;
    const res = await fetch('/api/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_samples' })
    });
    const d = await res.json();
    alert(d.message || '完了しました');
    loadRecommendedQuest();
    updateReviewBadge();
  });
}

async function postItem(payload, formEl) {
  try {
    const res = await fetch('/api/registered-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('登録しました！ 今後のクエスト推薦候補に加わります。');
      formEl.reset();
      loadRecommendedQuest();
    } else {
      alert(data.error || '登録失敗');
    }
  } catch (err) {
    alert('通信エラー');
  }
}

async function checkJevStatus() {
  const tag = document.getElementById('jevStatusTag');
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.jevConfigured) {
      tag.className = 'status-indicator-tag active';
      tag.textContent = '🟢 Jev AI有効 (Choice/Score/Noul)';
    } else {
      tag.className = 'status-indicator-tag';
      tag.textContent = '⚪ ルール動作中 (キー未設定)';
    }
  } catch (e) {
    tag.textContent = 'エラー';
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
