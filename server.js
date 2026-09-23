// ローカル実行用エントリーポイント (npm start)
// SUPABASE_URL / SUPABASE_ANON_KEY を設定すると、ローカルでもクラウド版と同じ構成（ログイン + Supabase）で動く。
const http = require('node:http');
const { createAppFromEnv } = require('./lib/bootstrap');
const { APP_NAME } = require('./lib/app');

const PORT = process.env.PORT || 3000;
// 既定ではこのPCからのみアクセス可能（APIキーを扱うため）
const HOST = process.env.HOST || '127.0.0.1';

const handler = createAppFromEnv({ rootDir: __dirname });
const server = http.createServer(handler);

server.listen(PORT, HOST, () => {
  const cloud = Boolean(process.env.SUPABASE_URL);
  console.log(`[${APP_NAME}] 起動しました: http://localhost:${PORT}`);
  console.log(`- モード: ${cloud ? 'cloud（GitHubログイン + Supabase）' : 'local（このPCの data/ に保存）'}`);
  console.log(`- Jev APIキー: ${process.env.JEV_API_KEY ? '環境変数から読み込み済み' : (cloud ? '未設定（JEV_API_KEY を設定してください）' : '環境変数なし（画面の「設定」から保存したキーを使用）')}`);
});
