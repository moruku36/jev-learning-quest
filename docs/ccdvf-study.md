> 初回リリース時の記録です。現在は100問・最大100問セッションに拡張しています。最新の件数と検証範囲は [問題拡充の記録](exam-expansion.md) を参照してください。

# 一問一答の簡素化と Claude CCDV-F

確認日: 2026-10-25。追加資格は Anthropic の **Claude Certified Developer – Foundations（CCDV-F）**。クラウド資格ではありません。

## 学習の開始

「学ぶ」は分野と問題数（5 / 10 / 20 / 30、初期値20）を選んで開始します。時間・難易度の選択は不要です。問題数は端末に保存します。Jev による候補選択と未設定時のルールによる選択は維持しています。API接続設定は設定タブにあります。

答え・解説はすぐ表示でき、自己判定後に次問へ進めます。キーボード操作も従来のガードを維持します。問題プールが指定数に満たなければ実際の問題数を表示します。通常練習は学習済み問題も補充するため、全問学習後も再開始できます。復習モードは復習対象だけです。

ネットワークは既存の原本画像付き午前問題を指定数のセッションとして出題し、各問を従来どおり保存します。個別の記述演習は既存機能を維持します。保存済み履歴・進捗の削除や移行は行いません。旧APIの時間指定も維持しています。Claudeは既存AWS/GCP同様、オフライン出題対象外です。

## 問題とカバー範囲

分野「Claude」の配下に「Claudeコース：すべて / CCDV-F」を配置しています。`CLAUDE_COURSES` をコース台帳とし、推薦APIの `claudeCourse` で絞り込み、`/api/content` の `claude.courses` でコース別情報を返します。未指定・不正なコース値は「すべて」に戻します。現在の登録資格はCCDV-Fのみです。端末に保存したClaudeコースを復元し、他分野に切り替えても選択を保ちます。

`lib/content/claude.js` に独自の日本語問題32問を追加しました。各問には正答、独自の誤答選択肢3つ、短い解説、出典URL、確認日があります。公式問題・再現問題ではなく、合否判定や本番問題の予測は行いません。公式サンプルや参考HTMLの問題本文を転載していません。

公式 Exam Guide v1.0（July 2026）の8領域を各4問でカバーします。学習用の均等配分であり、出題比率を再現した模擬試験ではありません。

| 公式領域 | 公式比率 | 収録数 |
| --- | ---: | ---: |
| Agents and Workflows | 14.7% | 4 |
| Applications and Integration | 33.1% | 4 |
| Claude Code | 3.1% | 4 |
| Eval / Testing / Debugging | 2.6% | 4 |
| Model Selection / Optimization | 16.8% | 4 |
| Prompt / Context Engineering | 11% | 4 |
| Security / Safety | 8.1% | 4 |
| Tools / MCPs | 10.6% | 4 |

## 一次資料

- [資格の正式名称（Pearson VUE）](https://www.pearsonvue.com/us/en/anthropic.html)
- [公式 Exam Guide](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542875%2FClaude+Certified+Developer+%E2%80%93+Foundations+Exam+Guide.pdf)
- [Agents / Workflows](https://www.anthropic.com/research/building-effective-agents)
- [Messages](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)、[Batch](https://platform.claude.com/docs/en/build-with-claude/batch-processing)、[Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)、[API errors](https://platform.claude.com/docs/en/api/errors)、[Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Claude Code](https://code.claude.com/docs/en/best-practices)、[Evaluation](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- [Models](https://platform.claude.com/docs/en/about-claude/models/overview)、[Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)、[Guardrails](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks)
- [Tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)、[MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture)、[MCP security](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)

## ローカル検証

`npm test` と `npm run check` を使用します。独立したbuildスクリプトはなく、静的HTML/JSとNodeサーバー構成です。新規 `test_ccdvf.js` で32問・8領域・独自選択肢・指定数・不足時・全問学習後・保存互換・旧時間指定を検証します。既存のクイズガードと画面遷移VMにも回帰テストを追加しました。

`node scripts/preview-study.js` はAPIキーを無効化し、別の一時保存先で `http://127.0.0.1:4317` を起動します。既存ユーザーデータを使わず画面確認できます。

実ブラウザーでPC（1280×900）・モバイル（375×812）、20問開始、即答・出典表示、キー操作、次問、5問完了・再開始、未回答で戻る、問題数復元、ネットワーク連続出題を確認しました。モバイルで横方向のはみ出しはありません。

依存取得がTLSハンドシェイクエラーで失敗したため、独立したPlaywrightスイート `test_learning_ui.js` は未実行です。代わりに接続済みブラウザーで上記UI操作を確認しました。Anthropic SDK未導入の任意モック検証は既存テストの明示的スキップです。実課金APIは使用していません。
