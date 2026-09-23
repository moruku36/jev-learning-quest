// Vercel Function エントリーポイント
// vercel.json の rewrites で /api/* がすべてここに届く（req.url は元のパスのまま）。
const path = require('node:path');
const { createAppFromEnv } = require('../lib/bootstrap');

module.exports = createAppFromEnv({ rootDir: path.join(__dirname, '..'), forceCloud: true });
