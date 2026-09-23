// Jev 学習クエスト: HTTP ハンドラー本体
// ローカル (server.js) と Vercel (api/index.js) の両方から同じハンドラーを使う。
//   - local モード: data/ の JSON ファイルに保存、ログインなし（127.0.0.1 でのみ待ち受け）
//   - cloud モード: Supabase Auth (GitHub ログイン + 許可リスト) と Supabase Postgres に保存
const fs = require('node:fs');
const path = require('node:path');
const { INITIAL_DATA } = require('./sample-data');
const { HttpError } = require('./supabase');
const { applySecurityHeaders } = require('./security');
const {
  JEV_TIMEOUT_MS,
  callJevSystemOne,
  recommendQuestWithJev,
  evaluateResultWithJev
} = require('./quest-engine');

const APP_NAME = 'Jev 学習クエスト';
const APP_VERSION = '1.3.0';
const MAX_BODY_BYTES = 2 * 1024 * 1024;

// Jev を呼ぶ API の簡易レート制限（ユーザーごと・1分あたり）
const JEV_RATE_LIMIT_PER_MIN = 30;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function clip(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function parseJsonBody(req) {
  // Vercel は JSON ボディを req.body に展開済みのことがある
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      try {
        return Promise.resolve(req.body ? JSON.parse(req.body) : {});
      } catch (err) {
        return Promise.reject(new HttpError(400, 'JSONの形式が正しくありません'));
      }
    }
    return Promise.resolve(req.body || {});
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        req.destroy();
        reject(new HttpError(413, 'データが大きすぎます'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new HttpError(400, 'JSONの形式が正しくありません'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function maskKey(key) {
  if (!key) return '';
  return key.length <= 8 ? '••••' : `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

function describeJevError(result) {
  if (result.reason === 'TIMEOUT') return `タイムアウトしました（${JEV_TIMEOUT_MS / 1000}秒）。ネットワーク環境を確認してください。`;
  if (result.reason === 'NETWORK_ERROR') return `Jev に接続できませんでした: ${result.detail || ''}`;
  if (result.httpStatus === 401 || result.httpStatus === 403) return 'APIキーが無効です。キーをもう一度確認してください。';
  if (result.httpStatus) return `Jev API エラー (HTTP ${result.httpStatus}) ${result.detail || ''}`;
  return 'Jev から想定外の応答がありました。';
}

async function testJevKey(apiKey) {
  const startTime = Date.now();
  const result = await callJevSystemOne({
    apiKey,
    state: 'ユーザーが Jev 学習クエストの接続テストを実行中。',
    questions: {
      ping_check: { type: 'noul', instructions: '接続は正常ですか？' }
    }
  });
  const elapsedMs = Date.now() - startTime;
  if (result.success) {
    return { success: true, elapsedMs, message: `Jev に接続できました（応答 ${elapsedMs}ms）` };
  }
  const errorType = (result.httpStatus === 401 || result.httpStatus === 403) ? 'auth'
    : (result.reason === 'TIMEOUT' || result.reason === 'NETWORK_ERROR') ? 'network' : 'other';
  return { success: false, elapsedMs, errorType, error: describeJevError(result) };
}

/**
 * @param {object} options
 * @param {'local'|'cloud'} options.mode
 * @param {object|null} options.storage  createFileStorage() / createSupabaseBackend() の戻り値。null は設定不備
 * @param {string} [options.publicDir]   local モードで配信する静的ファイルのフォルダ
 * @param {object} [options.publicConfig] ブラウザに渡してよい設定（Supabase URL と公開キー）
 * @param {string} [options.configError]  cloud モードで設定が足りない場合の説明
 */
function createApp({ mode, storage, publicDir, publicConfig = {}, configError }) {
  const isCloud = mode === 'cloud';
  const rateBuckets = new Map();

  function getJevKeyInfo() {
    const envKey = (process.env.JEV_API_KEY || '').trim();
    if (envKey) return { key: envKey, source: 'env' };
    const savedKey = storage && storage.keyStore ? storage.keyStore.get() : '';
    if (savedKey) return { key: savedKey, source: 'saved' };
    return { key: '', source: 'none' };
  }

  function jevStatusPayload() {
    const info = getJevKeyInfo();
    return {
      jevConfigured: Boolean(info.key),
      keySource: info.source, // 'env' | 'saved' | 'none'
      keyEditable: Boolean(storage && storage.keyStore) && info.source !== 'env',
      maskedKey: maskKey(info.key)
    };
  }

  function checkRateLimit(userKey) {
    const now = Date.now();
    const bucket = rateBuckets.get(userKey) || [];
    const recent = bucket.filter(t => now - t < 60 * 1000);
    if (recent.length >= JEV_RATE_LIMIT_PER_MIN) {
      throw new HttpError(429, '短時間にリクエストが多すぎます。1分ほど待ってから再度お試しください');
    }
    recent.push(now);
    rateBuckets.set(userKey, recent);
  }

  function serveStatic(res, pathname) {
    const filePath = path.resolve(publicDir, '.' + (pathname === '/' ? '/index.html' : decodeURIComponent(pathname)));
    if (!filePath.startsWith(publicDir + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      sendJson(res, 404, { error: 'Not Found' });
      return;
    }
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
  }

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    applySecurityHeaders(res);

    try {
      // ブラウザに渡す公開設定（ログイン前に必要なので認証不要）
      if (req.method === 'GET' && pathname === '/api/config') {
        sendJson(res, 200, {
          appName: APP_NAME,
          version: APP_VERSION,
          mode,
          configError: configError || null,
          supabaseUrl: publicConfig.supabaseUrl || null,
          supabaseAnonKey: publicConfig.supabaseAnonKey || null
        });
        return;
      }

      if (!pathname.startsWith('/api/')) {
        // Vercel では静的ファイルは CDN が配信するので、ここに来るのはローカル実行時のみ
        if (publicDir && req.method === 'GET') {
          serveStatic(res, pathname);
          return;
        }
        sendJson(res, 404, { error: 'Not Found' });
        return;
      }

      if (!storage) {
        throw new HttpError(503, configError || 'サーバーの設定が完了していません');
      }

      // 書き込み系APIは JSON のみ受け付ける（フォームを使ったクロスサイト送信を防ぐ）
      if (req.method === 'POST' && !(req.headers['content-type'] || '').includes('application/json')) {
        throw new HttpError(415, 'Content-Type は application/json を指定してください');
      }

      // cloud モードでは全 API にログインと許可リストを要求する
      const ctx = { user: null, token: null };
      if (isCloud) {
        const authHeader = req.headers.authorization || '';
        ctx.token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        ctx.user = await storage.authenticate(ctx.token);
      }
      const userKey = ctx.user ? ctx.user.id : 'local';

      // 1. アプリ / Jev の状態 (キーそのものは返さない)
      if (req.method === 'GET' && pathname === '/api/status') {
        sendJson(res, 200, {
          appName: APP_NAME,
          version: APP_VERSION,
          mode,
          user: ctx.user ? { email: ctx.user.email } : null,
          ...jevStatusPayload()
        });
        return;
      }

      // 1-b. Jev APIキーの保存 / 削除（local モードのみ）
      if (req.method === 'POST' && pathname === '/api/settings/jev-key') {
        const body = await parseJsonBody(req);
        const status = jevStatusPayload();
        if (!status.keyEditable) {
          sendJson(res, 409, {
            success: false,
            error: isCloud
              ? 'クラウド版では、APIキーを Vercel の環境変数 JEV_API_KEY に設定してください（画面からは変更できません）。'
              : '環境変数 JEV_API_KEY が設定されているため、画面からは変更できません。',
            ...status
          });
          return;
        }
        const apiKey = clip(body.apiKey, 500);
        storage.keyStore.set(apiKey);
        sendJson(res, 200, {
          success: true,
          message: apiKey ? 'Jev APIキーを保存しました' : 'Jev APIキーを削除しました（ルールで動作します）',
          ...jevStatusPayload()
        });
        return;
      }

      // 1-c. Jev API 接続テスト（cloud モードでは設定済みのキーのみテスト可能）
      if (req.method === 'POST' && pathname === '/api/settings/test-jev') {
        const body = await parseJsonBody(req);
        checkRateLimit(userKey);
        const inputKey = isCloud ? '' : clip(body.apiKey, 500);
        const testKey = inputKey || getJevKeyInfo().key;
        if (!testKey) {
          sendJson(res, 400, { success: false, error: isCloud ? 'JEV_API_KEY が設定されていません。' : 'APIキーを入力してください。' });
          return;
        }
        sendJson(res, 200, await testJevKey(testKey));
        return;
      }

      // 2. 今日のクエスト推薦 (Jev Choice or ルールベース)
      if (req.method === 'POST' && pathname === '/api/quest/recommend') {
        const body = await parseJsonBody(req);
        const apiKey = getJevKeyInfo().key;
        if (apiKey) checkRateLimit(userKey);
        const store = await storage.load(ctx);
        const minutes = Math.min(Math.max(parseInt(body.minutes, 10) || 20, 5), 180);
        const category = ['all', 'sc', 'ai', 'cloud', 'security'].includes(body.category) ? body.category : 'all';
        const goal = ['balance', 'weakness', 'exercise', 'input'].includes(body.goal) ? body.goal : 'balance';

        const result = await recommendQuestWithJev({ store, category, minutes, goal, apiKey });
        sendJson(res, 200, result);
        return;
      }

      // 3. クエスト結果の保存
      if (req.method === 'POST' && pathname === '/api/history') {
        const body = await parseJsonBody(req);
        const apiKey = getJevKeyInfo().key;
        if (apiKey) checkRateLimit(userKey);
        const store = await storage.load(ctx);
        const isCorrect = body.isCorrect === true || body.isCorrect === 'true';

        const resultData = {
          title: clip(body.title, 300),
          category: clip(body.category, 20),
          isCorrect,
          mistakeReason: clip(body.mistakeReason, 50),
          mistakeDetail: clip(body.mistakeDetail, 2000),
          notes: clip(body.notes, 2000),
          userAnswer: clip(body.userAnswer, 10000)
        };

        // Jev Score / Noul または ルールベースで判定
        const evalRes = await evaluateResultWithJev({ resultData, apiKey });

        const newHistory = {
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          itemId: clip(body.itemId, 100) || null,
          retryOf: clip(body.retryOf, 100) || null,
          category: resultData.category || 'sc',
          questType: clip(body.questType, 50) || '演習',
          title: resultData.title || '完了クエスト',
          minutes: parseInt(body.minutes, 10) || 15,
          reason: clip(body.reason, 1000),
          criteria: clip(body.criteria, 1000),
          decisionSource: clip(body.decisionSource, 30) || evalRes.decisionSource,
          userAnswer: resultData.userAnswer,
          isCorrect,
          mistakeReason: resultData.mistakeReason, // 読み落とし / 知識不足 / 設問要求とのずれ / 時間不足
          mistakeDetail: resultData.mistakeDetail,
          notes: resultData.notes,
          understandingScore: evalRes.understandingScore,
          noulNeedsReview: evalRes.needsReview,
          reviewIntervalDays: evalRes.needsReview ? (isCorrect ? 7 : 3) : 14,
          nextReviewDate: evalRes.needsReview
            ? new Date(Date.now() + (isCorrect ? 7 : 3) * 86400000).toISOString()
            : null,
          isSample: false,
          completedAt: new Date().toISOString()
        };

        // 再挑戦で正解できたら、元の誤答を「克服済み」にして復習リストから外す
        let resolvedHistoryId = null;
        if (newHistory.retryOf) {
          const original = store.history.find(h => h.id === newHistory.retryOf);
          if (original) {
            if (isCorrect) {
              original.resolved = true;
              original.resolvedAt = newHistory.completedAt;
              resolvedHistoryId = original.id;
            } else {
              // 再び誤答した場合は数日後にもう一度出題する
              original.nextReviewDate = new Date(Date.now() + 3 * 86400000).toISOString();
            }
          }
        }

        store.history.unshift(newHistory);
        await storage.save(ctx, store);

        // 演習後に初めて解答ポイントを見せる
        const item = store.items.find(i => i.id === newHistory.itemId);

        sendJson(res, 201, {
          success: true,
          history: newHistory,
          evaluation: evalRes,
          resolvedHistoryId,
          answerNotes: item ? item.notes || '' : ''
        });
        return;
      }

      // 4. 学習履歴一覧の取得
      if (req.method === 'GET' && pathname === '/api/history') {
        const store = await storage.load(ctx);
        sendJson(res, 200, { history: store.history });
        return;
      }

      // 5. 登録アイテム（過去問・キャッチアップ）の一覧取得
      if (req.method === 'GET' && pathname === '/api/registered-items') {
        const store = await storage.load(ctx);
        sendJson(res, 200, { items: store.items });
        return;
      }

      // 6. 新規アイテムの登録（過去問 または 技術情報キャッチアップ）
      if (req.method === 'POST' && pathname === '/api/registered-items') {
        const body = await parseJsonBody(req);
        const title = clip(body.title, 300);
        const category = ['sc', 'ai', 'cloud', 'security'].includes(body.category) ? body.category : '';
        if (!title || !category) {
          sendJson(res, 400, { error: 'タイトルと分野は必須です' });
          return;
        }
        const itemUrl = clip(body.url, 1000);

        const store = await storage.load(ctx);
        const newItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: body.type === 'sc_past_paper' ? 'sc_past_paper' : 'catchup',
          category,
          title,
          source: clip(body.source, 300),
          // javascript: などの危険なスキームは保存しない
          url: /^https?:\/\//i.test(itemUrl) ? itemUrl : '',
          publishedDate: clip(body.publishedDate, 20),
          questionText: clip(body.questionText, 5000),
          userAnswer: clip(body.userAnswer, 10000),
          notes: clip(body.notes, 5000),
          practicalValue: ['high', 'medium', 'low'].includes(body.practicalValue) ? body.practicalValue : 'medium',
          needsReview: body.needsReview === true || body.needsReview === 'true',
          nextAction: clip(body.nextAction, 50) || '既存知識と比較する', // 試す, 設定を確認する, 既存知識と比較する, チーム向けに説明する
          isSample: false,
          createdAt: new Date().toISOString()
        };

        store.items.unshift(newItem);
        await storage.save(ctx, store);

        sendJson(res, 201, { success: true, item: newItem });
        return;
      }

      // 7. サンプルデータの初期投入 / リセット
      if (req.method === 'POST' && pathname === '/api/seed') {
        const body = await parseJsonBody(req);
        const store = await storage.load(ctx);
        if (body.action === 'reset_all') {
          await storage.save(ctx, structuredClone(INITIAL_DATA));
          sendJson(res, 200, { success: true, message: '全データを初期サンプル状態にリセットしました' });
          return;
        } else if (body.action === 'add_samples') {
          const existingIds = new Set(store.items.map(i => i.id));
          INITIAL_DATA.items.forEach(item => {
            if (!existingIds.has(item.id)) store.items.push(item);
          });
          const existingHistIds = new Set(store.history.map(h => h.id));
          INITIAL_DATA.history.forEach(h => {
            if (!existingHistIds.has(h.id)) store.history.push(h);
          });
          await storage.save(ctx, store);
          sendJson(res, 200, { success: true, message: 'サンプルデータを追加しました' });
          return;
        } else if (body.action === 'clear_samples') {
          store.items = store.items.filter(i => !i.isSample);
          store.history = store.history.filter(h => !h.isSample);
          await storage.save(ctx, store);
          sendJson(res, 200, { success: true, message: 'サンプルデータを削除しました（あなたのデータは残っています）' });
          return;
        }
        sendJson(res, 400, { error: 'Unknown action' });
        return;
      }

      // 8. データのエクスポート / バックアップ (APIキーは含めない)
      if (req.method === 'GET' && pathname === '/api/backup') {
        const store = await storage.load(ctx);
        const date = new Date().toISOString().slice(0, 10);
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="jev_learning_quest_backup_${date}.json"`,
          'Cache-Control': 'no-store'
        });
        res.end(JSON.stringify(store, null, 2));
        return;
      }

      // 9. データのインポート
      if (req.method === 'POST' && pathname === '/api/backup') {
        const body = await parseJsonBody(req);
        if (!Array.isArray(body.items) || !Array.isArray(body.history)) {
          sendJson(res, 400, { error: 'バックアップファイルの形式が正しくありません' });
          return;
        }
        await storage.save(ctx, { items: body.items, history: body.history });
        sendJson(res, 200, { success: true, message: `データを復元しました（素材 ${body.items.length}件 / 記録 ${body.history.length}件）` });
        return;
      }

      sendJson(res, 404, { error: 'Not Found' });
    } catch (err) {
      if (err instanceof HttpError) {
        sendJson(res, err.status, { success: false, error: err.message });
        return;
      }
      console.error('Server Error:', err);
      // 内部エラーの詳細はクライアントに返さない
      sendJson(res, 500, { success: false, error: 'サーバー内部でエラーが発生しました' });
    }
  };
}

module.exports = { createApp, APP_NAME, APP_VERSION };
