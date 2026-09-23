// 完了条件の総合自動検証スクリプト
const assert = require('node:assert');

async function runVerification() {
  console.log('=== [1] キー未設定時の動作検証 ===');

  // 1-1. ステータス確認
  const statusRes = await fetch('http://localhost:3000/api/status');
  const status = await statusRes.json();
  assert.strictEqual(status.jevConfigured, false, 'Jevキー未設定が正しく認識されていること');
  console.log('✔ ステータス確認成功: JEV_API_KEY未設定でもアプリが稼働中');

  // 1-2. 新規の支援士過去問と技術情報を登録
  console.log('\n=== [2] 学習素材の登録 & 出典・次アクション検証 ===');
  const regSCRes = await fetch('http://localhost:3000/api/registered-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'sc_past_paper',
      category: 'sc',
      title: '令和6年春期 支援士 科目B 問3 (DNSSEC)',
      source: 'IPA 過去問題 令和6年春期',
      publishedDate: '2024-04-21',
      questionText: '設問2: DNSキャッシュポイズニング攻撃に対してDNSSECが提供するセキュリティ機能を2つ答えよ。',
      notes: 'データの完全性と発信元認証'
    })
  });
  const regSCData = await regSCRes.json();
  assert.strictEqual(regSCData.success, true);
  const scItemId = regSCData.item.id;
  console.log('✔ 支援士過去問の登録成功:', regSCData.item.title);

  const regCURes = await fetch('http://localhost:3000/api/registered-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'catchup',
      category: 'security',
      title: 'ゼロトラストネットワークにおけるmTLS運用設計ガイド',
      source: 'セキュリティ専門機関 レポート',
      url: 'https://example.com/sec/mtls-guide',
      publishedDate: '2026-09-22',
      practicalValue: 'high',
      nextAction: '設定を確認する',
      notes: '証明書失効リスト(CRL)の同期遅延リスクの評価'
    })
  });
  const regCUData = await regCURes.json();
  assert.strictEqual(regCUData.success, true);
  assert.strictEqual(regCUData.item.nextAction, '設定を確認する');
  assert.strictEqual(regCUData.item.source, 'セキュリティ専門機関 レポート');
  console.log('✔ キャッチアップ情報の登録成功（出典と次の行動が確実に付与）:', regCUData.item.title, '->', regCUData.item.nextAction);

  // 1-3. クエスト推薦 (登録した支援士過去問が候補に反映されるか)
  console.log('\n=== [3] クエスト推薦とルールベース判定 ===');
  const recRes = await fetch('http://localhost:3000/api/quest/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minutes: 30, category: 'sc', goal: 'exercise' })
  });
  const recData = await recRes.json();
  assert.ok(recData.quest);
  assert.strictEqual(recData.decisionSource, 'rule');
  console.log('✔ クエスト推薦成功:', recData.quest.title, `(${recData.decisionSource})`);

  // 1-4. 支援士の演習実行と「誤答・誤答原因」の記録
  console.log('\n=== [4] クエスト実行 & 支援士誤答原因の記録 ===');
  const histRes1 = await fetch('http://localhost:3000/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId: scItemId,
      category: 'sc',
      questType: '過去問を解く',
      title: '令和6年春期 支援士 科目B 問3 (DNSSEC) 初回演習',
      minutes: 25,
      reason: '科目Bの記述演習',
      criteria: '完全性と発信元認証のキーワードを正確に記述できること',
      decisionSource: 'rule',
      userAnswer: 'データの暗号化とアクセスコントロール。',
      isCorrect: false, // 誤答
      mistakeReason: '知識不足', // 誤答原因
      mistakeDetail: 'DNSSECは暗号化ではなく電子署名による完全性・認証を提供する点を混同していた',
      notes: '3日後に再挑戦する'
    })
  });
  const histData1 = await histRes1.json();
  assert.strictEqual(histData1.success, true);
  assert.strictEqual(histData1.evaluation.needsReview, true);
  console.log('✔ 誤答結果の保存成功（要復習フラグ付与）:', histData1.history.title);

  // 1-5. 誤答から再挑戦クエストが最優先候補として生成されるか検証
  console.log('\n=== [5] 誤答からの再挑戦クエスト自動生成検証 ===');
  const recReviewRes = await fetch('http://localhost:3000/api/quest/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minutes: 20, category: 'sc', goal: 'weakness' })
  });
  const recReviewData = await recReviewRes.json();
  assert.ok(recReviewData.quest);
  assert.strictEqual(recReviewData.quest.type, '誤答を直す');
  assert.ok(recReviewData.quest.title.includes('弱点克服'));
  console.log('✔ 再挑戦クエストが最優先で推薦された:', recReviewData.quest.title);
  console.log('  理由:', recReviewData.quest.reason);

  // 1-6. キャッチアップクエストの実行と完了
  console.log('\n=== [6] キャッチアップクエスト実行 & 次の行動記録 ===');
  const histRes2 = await fetch('http://localhost:3000/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId: regCUData.item.id,
      category: 'security',
      questType: '実務への影響を整理する',
      title: '技術キャッチアップ: ゼロトラストネットワークにおけるmTLS運用設計ガイド',
      minutes: 15,
      reason: '実務への影響を整理し設定を確認する',
      criteria: '社内ステージング環境のmTLS設定とCRL更新頻度を確認する',
      decisionSource: 'rule',
      userAnswer: '社内ステージングのCRL同期間隔を24hから1hに短縮するタスクを起票した。',
      isCorrect: true,
      notes: '来週のインフラレビューで共有'
    })
  });
  const histData2 = await histRes2.json();
  assert.strictEqual(histData2.success, true);
  console.log('✔ キャッチアップクエストの完了保存成功:', histData2.history.title);

  // 1-7. 再起動後の永続化確認テスト
  console.log('\n=== [7] 再起動後のデータ永続化検証 ===');
  const fs = require('node:fs');
  const storePath = require('node:path').join(__dirname, 'data', 'store.json');
  const rawSaved = fs.readFileSync(storePath, 'utf8');
  const savedData = JSON.parse(rawSaved);
  const foundSCItem = savedData.items.find(i => i.id === scItemId);
  const foundHistory = savedData.history.find(h => h.itemId === scItemId);
  assert.ok(foundSCItem, '登録した支援士アイテムがファイルに永続化されていること');
  assert.ok(foundHistory, '登録した誤答履歴がファイルに永続化されていること');
  assert.strictEqual(foundHistory.mistakeReason, '知識不足');
  console.log('✔ ファイルへの永続化確認成功 (data/store.json)');

  console.log('\n=========================================');
  console.log('🎉 すべての自動検証要件をパスしました！');
  console.log('=========================================');
}

runVerification().catch(err => {
  console.error('❌ 検証失敗:', err);
  process.exit(1);
});
