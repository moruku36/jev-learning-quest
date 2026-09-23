// 環境変数から実行モードを決めてハンドラーを作る
//   SUPABASE_URL と SUPABASE_ANON_KEY があれば cloud モード、なければ local モード。
//   Vercel 上 (VERCEL=1) では必ず cloud モード。設定が足りない場合はすべての API を 503 で拒否する（fail closed）。
const path = require('node:path');
const { createApp } = require('./app');
const { createFileStorage } = require('./storage-file');
const { createSupabaseBackend } = require('./supabase');

function createAppFromEnv({ rootDir, forceCloud = false } = {}) {
  const env = process.env;
  const supabaseUrl = (env.SUPABASE_URL || '').trim();
  const supabaseAnonKey = (env.SUPABASE_ANON_KEY || '').trim();
  const cloud = forceCloud || Boolean(env.VERCEL) || Boolean(supabaseUrl && supabaseAnonKey);

  if (!cloud) {
    const dataDir = env.LQ_DATA_DIR ? path.resolve(env.LQ_DATA_DIR) : path.join(rootDir, 'data');
    return createApp({
      mode: 'local',
      storage: createFileStorage(dataDir),
      publicDir: path.join(rootDir, 'public')
    });
  }

  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
  if (supabaseUrl && !/^https:\/\//.test(supabaseUrl) && !env.LQ_ALLOW_INSECURE_SUPABASE) missing.push('SUPABASE_URL (https:// で始まる必要があります)');

  if (missing.length > 0) {
    return createApp({
      mode: 'cloud',
      storage: null,
      configError: `サーバーの環境変数が不足しています: ${missing.join(', ')}`
    });
  }

  return createApp({
    mode: 'cloud',
    storage: createSupabaseBackend({ url: supabaseUrl, anonKey: supabaseAnonKey }),
    publicDir: path.join(rootDir, 'public'),
    publicConfig: { supabaseUrl, supabaseAnonKey }
  });
}

module.exports = { createAppFromEnv };
