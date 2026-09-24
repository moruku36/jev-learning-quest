// 記述答案の採点補助と Claude による添削
//   - キーワード照合: 解答例のキーワードが答案に含まれるかを調べる（外部通信なし）
//   - Claude 添削: 環境変数 ANTHROPIC_API_KEY があるときだけ使う（Jev は判断専用、文章は Claude が書く）
// SDK は添削を使うときだけ読み込むので、ローカル版は npm install なしでも動く。

const REVIEW_MODEL = 'claude-opus-5';
const REVIEW_TIMEOUT_MS = 50000;
const MAX_REVIEW_INPUT_CHARS = 20000;

// 「、」「,」改行などで区切ったキーワードを配列にする
function parseKeywords(text) {
  if (typeof text !== 'string') return [];
  return [...new Set(text.split(/[、,，;；\n\/／]+/).map(k => k.trim()).filter(Boolean))].slice(0, 30);
}

// 表記ゆれを少し吸収して比較する（全角英数→半角、空白除去、小文字化）
function normalize(text) {
  return String(text || '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\s+/g, '')
    .toLowerCase();
}

function checkKeywords(answer, keywordsText) {
  const keywords = parseKeywords(keywordsText);
  if (keywords.length === 0) return null;
  const body = normalize(answer);
  const matched = keywords.filter(k => body.includes(normalize(k)));
  const missing = keywords.filter(k => !matched.includes(k));
  return { matched, missing, rate: matched.length / keywords.length };
}

function isReviewConfigured() {
  return Boolean((process.env.ANTHROPIC_API_KEY || '').trim());
}

let clientCache = null;
function getClient() {
  if (!isReviewConfigured()) return null;
  if (!clientCache) {
    // eslint-disable-next-line global-require
    const mod = require('@anthropic-ai/sdk');
    const Anthropic = mod.default || mod.Anthropic || mod;
    // ANTHROPIC_API_KEY（と、テスト時は ANTHROPIC_BASE_URL）を環境変数から読む
    clientCache = { Anthropic, client: new Anthropic({ timeout: REVIEW_TIMEOUT_MS, maxRetries: 1 }) };
  }
  return clientCache;
}

const SYSTEM_PROMPT = `あなたは情報処理安全確保支援士試験（午後・科目B）の記述答案を添削する講師です。
受験者の答案を、設問の要求と解答例（与えられた場合）に照らして評価し、次の形式の日本語で返してください。

## 総合評価
A（ほぼ満点）/ B（部分点が期待できる）/ C（要点が不足）/ D（的外れ）のどれかと、その理由を1〜2文で。

## 良い点
箇条書きで1〜3点。

## 改善点
箇条書きで。設問の要求とのずれ、不足しているキーワード、字数や表現の問題を具体的に。

## 模範的な書き方の例
設問の要求を満たす書き方の例を、答案の分量に合わせて示す。

解答例が与えられていない場合は、一般的なセキュリティの知識から評価し、その旨を一言添えてください。
問題文が与えられていない場合は、答案とテーマから推測して評価してください。推測で断定しすぎないこと。`;

/**
 * Claude に答案を添削してもらう
 * @returns {Promise<{ok: true, feedback: string, model: string} | {ok: false, status: number, error: string}>}
 */
async function reviewAnswer({ title, questionText, modelAnswer, userAnswer }) {
  const sdk = getClient();
  if (!sdk) return { ok: false, status: 503, error: '添削機能が設定されていません（環境変数 ANTHROPIC_API_KEY）' };

  const parts = [
    `# 問題\n${title || '（タイトルなし）'}`,
    questionText ? `# 設問\n${questionText}` : '# 設問\n（与えられていません）',
    modelAnswer ? `# 解答例・採点キーワード\n${modelAnswer}` : '# 解答例\n（与えられていません）',
    `# 受験者の答案\n${userAnswer}`
  ];
  const content = parts.join('\n\n').slice(0, MAX_REVIEW_INPUT_CHARS);

  const { Anthropic, client } = sdk;
  try {
    const response = await client.beta.messages.create({
      model: REVIEW_MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      // 添削は数十秒以内に返したいので、思考の深さは medium にする
      output_config: { effort: 'medium' },
      // 安全性分類器で断られた場合は、推奨のモデルでサーバー側で再実行する
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }]
    });

    if (response.stop_reason === 'refusal') {
      return { ok: false, status: 422, error: 'この答案は添削できませんでした（安全上の理由で応答が拒否されました）' };
    }
    const feedback = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();
    if (!feedback) return { ok: false, status: 502, error: '添削結果が空でした。もう一度お試しください' };
    return { ok: true, feedback, model: response.model };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, status: 502, error: 'Claude の APIキーが無効です（ANTHROPIC_API_KEY を確認してください）' };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, status: 429, error: 'Claude の利用上限に達しました。しばらく待ってから再度お試しください' };
    }
    if (err instanceof Anthropic.APIConnectionTimeoutError || err instanceof Anthropic.APIConnectionError) {
      return { ok: false, status: 504, error: 'Claude に接続できませんでした（タイムアウトまたは通信エラー）' };
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Claude API error:', err.status, err.message);
      return { ok: false, status: 502, error: `Claude API エラー (HTTP ${err.status || '-'})` };
    }
    throw err;
  }
}

module.exports = { checkKeywords, parseKeywords, isReviewConfigured, reviewAnswer, REVIEW_MODEL };
