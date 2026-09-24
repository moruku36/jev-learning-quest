// クラウド実行用: Supabase Auth でログインユーザーを確認し、Postgres (PostgREST) に学習データを保存する。
// すべての DB アクセスは「ログインユーザー本人のアクセストークン」で行うため、
// 行レベルセキュリティ (RLS) により本人かつ許可リスト登録済みのデータにしか触れられない。
// service_role キーは使わない。
const { emptyData, withoutSamples } = require('./initial-data');

const USER_CACHE_TTL_MS = 60 * 1000;
const USER_CACHE_MAX = 100;
const MAX_STORE_BYTES = 2 * 1024 * 1024;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function createSupabaseBackend({ url, anonKey, fetchImpl = fetch }) {
  const baseUrl = url.replace(/\/+$/, '');
  const userCache = new Map(); // token -> { user, expiresAt }

  function headers(token, extra = {}) {
    return {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      ...extra
    };
  }

  async function request(path, token, init = {}) {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: headers(token, init.headers)
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      const status = res.status === 401 ? 401 : res.status === 403 ? 403 : 502;
      throw new HttpError(status, `Supabase エラー (HTTP ${res.status}) ${detail.slice(0, 120)}`);
    }
    return res;
  }

  // アクセストークンを検証し、許可リストに載っているユーザーだけを通す
  async function authenticate(token) {
    if (!token) throw new HttpError(401, 'ログインしてください');

    const cached = userCache.get(token);
    if (cached && cached.expiresAt > Date.now()) return cached.user;

    let authUser;
    try {
      const res = await request('/auth/v1/user', token);
      authUser = await res.json();
    } catch (err) {
      if (err.status === 401 || err.status === 403) throw new HttpError(401, 'ログインの有効期限が切れました。もう一度ログインしてください');
      throw err;
    }
    if (!authUser || !authUser.id || !authUser.email) throw new HttpError(401, 'ユーザー情報を取得できませんでした');

    // RLS により、本人のメールアドレスの行だけが見える
    const res = await request(`/rest/v1/allowed_users?select=email&email=eq.${encodeURIComponent(authUser.email.toLowerCase())}`, token);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new HttpError(403, `${authUser.email} はこのアプリの利用を許可されていません`);
    }

    const user = { id: authUser.id, email: authUser.email };
    if (userCache.size >= USER_CACHE_MAX) userCache.delete(userCache.keys().next().value);
    userCache.set(token, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
    return user;
  }

  return {
    kind: 'supabase',
    location: 'Supabase (public.user_data)',
    authenticate,

    async load(ctx) {
      const res = await request(`/rest/v1/user_data?select=data&user_id=eq.${encodeURIComponent(ctx.user.id)}`, ctx.token);
      const rows = await res.json();
      if (Array.isArray(rows) && rows[0] && rows[0].data) return withoutSamples(rows[0].data);
      // 初回ログイン時は空のデータで始める
      return emptyData();
    },

    async save(ctx, data) {
      const body = JSON.stringify({ user_id: ctx.user.id, data, updated_at: new Date().toISOString() });
      if (Buffer.byteLength(body) > MAX_STORE_BYTES) {
        throw new HttpError(413, 'データが大きすぎます（上限 2MB）');
      }
      await request('/rest/v1/user_data?on_conflict=user_id', ctx.token, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body
      });
    },

    // クラウドでは APIキーを DB やブラウザに置かず、Vercel の環境変数だけで管理する
    keyStore: null
  };
}

module.exports = { createSupabaseBackend, HttpError };
