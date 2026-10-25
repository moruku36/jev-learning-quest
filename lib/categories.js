// 学習の「分野」（カテゴリ）の定義。
//   active   : 学習画面・おすすめ・復習・進捗に出す分野
//   archived : 旧分野。学習履歴や登録済みの教材は削除せず、データには残したまま画面・おすすめ・集計から外す
// 画面側 public/app.js の ARCHIVED_CATEGORIES と同じ内容にすること（test_verification.js が一致を確認する）。
// 注意: 一問一答の中分類「セキュリティ」（lib/content/fields.js の security）は、支援士 午前II の出題分野であり、
//       旧分野 'security' とは別物。ここで外すのは分野ID 'security' だけ。
const ACTIVE_CATEGORIES = ['nw', 'sc', 'aws', 'gcp', 'claude'];
const ARCHIVED_CATEGORIES = ['ai', 'cloud', 'security'];

const archivedSet = new Set(ARCHIVED_CATEGORIES);

function isArchivedCategory(category) {
  return archivedSet.has(category);
}

// 画面や集計に使う記録（履歴・登録教材）だけを残す。データそのものは変更しない
function withoutArchived(records) {
  return (Array.isArray(records) ? records : []).filter(r => !isArchivedCategory(r && r.category));
}

module.exports = { ACTIVE_CATEGORIES, ARCHIVED_CATEGORIES, isArchivedCategory, withoutArchived };
