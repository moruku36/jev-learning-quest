# Claude問題拡充レビュー

確認日: 2026-10-25。対象: Claude Certified Developer – Foundations (CCDV-F) のみ。

既存32問の後ろに独自の日本語問題68問を追加し、100問にした。公式試験問題、ダンプ、再現問題の利用はない。問題、正解、3誤答、短い解説、公式ドキュメントURL、試験ガイドURLを各カードに保持する。既存32カードの全フィールドを変更前のJSONと比較し一致を確認した。既存の行順・ID生成規則を維持する。

## 領域ごとの収録数

|領域|既存|追加|合計|
|---|---:|---:|---:|
|d1 Agents and Workflows|4|10|14|
|d2 Applications and Integration|4|25|29|
|d3 Claude Code|4|2|6|
|d4 Eval / Testing / Debugging|4|2|6|
|d5 Model Selection / Optimization|4|11|15|
|d6 Prompt / Context Engineering|4|7|11|
|d7 Security / Safety|4|4|8|
|d8 Tools / MCPs|4|7|11|
|合計|32|68|100|

連携領域を最多とし、既存カードを保持する制約の下で8領域を扱う。問題数は公式試験の出題比率の厳密な再現ではない。連携ではツール往復、SSE、エラー、Batch、構造化出力を別の判断点として扱った。

独立レビュー後、追加問 `claude-ccdvf-d5-81` を非同期処理の選択から `expired` の意味と再処理判断へ差し替えた。公式Batch資料のRetrieving batch resultsで、24時間の期限までにモデルへ送られなかった結果であり非課金であることを再確認した。既存32問と総数100問は維持。

## 今回閲覧した公式資料

- [Building effective agents](https://www.anthropic.com/research/building-effective-agents): ワークフロー、連鎖、動的な作業分解、評価・改善、実環境の確認。2024年の記事には新しいマネージド機能への案内があるため、この記事から現在の製品機能や価格は推定していない。
- [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools): 入力スキーマ、説明、tool_choice。既存のimplement-tool-use URLから転送される。強制選択の問題には対応モデル・設定という前提を明記した。
- [Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls): tool_use_id、user内のtool_result、is_error、結果の順序。
- [Using the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages): 履歴とコンテンツ形式。
- [Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming): ブロックとメッセージの完了、部分JSON、累積usage、途中エラー、未知イベント。
- [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing): 個別結果、終了状態、キャンセル、非同期処理。
- [API errors](https://platform.claude.com/docs/en/api/errors): 400、401、413、429、529とrequest-id。
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs): 最終出力とツール引数の形式制約。
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching): 固定プレフィックス、作成・読取のusage、境界。
- [Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting): リクエスト構成を使った事前見積もり。
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices): 文脈管理、サブエージェントでの調査分離。
- [Define success and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests): 代表例、採点基準、評価の設計。
- [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices): 例の一貫性、文脈、資料の区切り、具体的な出力指示。
- [Mitigate jailbreaks and prompt injections](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks): 第三者コンテンツの間接インジェクション。
- [MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture): resources、prompts、tools/list、stdio、Streamable HTTP。閲覧時は2026-07-28版へ転送された。新旧版で異なる発見ハンドシェイクやsamplingの詳細は新問に含めていない。
- [MCP security best practices](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices): SSRF、セッション、ローカルプロセスの信頼。閲覧時は2025-11-25 tutorialsへ転送された。

## 検証と留保

- Nodeでロード・構文検証し100問、100個の一意ID、100個の一意設問、各問3誤答、4選択肢の相互重複なし、URL・解説ありを確認した。
- `node --check lib/content/claude.js` は成功。`node test_ccdvf.js` は他ファミリーの拡充途中の件数（期待400/400、実際264/330）で停止した。Claudeの実際100問は期待値に一致している。全体テストは並行作業の完了後に再実行が必要。
- Unicode置換文字なし。PowerShellの表示では文字化けしたが、NodeでUTF-8実データを検査して日本語が保持されていることを確認した。
- 既存の公式ガイドURLは維持した。親タスクが確認済みの2026年7月v1ガイド・8領域を前提とする。この担当によるPDFの再取得はHTTP 403で失敗したため、ガイド自体を今回再閲覧できたとは扱わない。
- stop-reasonsページの取得はタイムアウトした。このページ専用の新規問題・出典は追加していない。
- 特定モデル名、価格、トークン上限、保存期間の暗記問題は追加していない。変更されやすい機能の対応条件は実装時に公式資料で確認する。
- リポジトリ全体のビルド・統合検証は親タスクの担当。コミット、push、認証変更、外部API実行、GUI操作は行っていない。
