# GCP基礎コース追加教材の確認記録

確認日: 2026-10-25。対象は `lib/content/gcp/extra-foundation.js` のみ。既存30問ずつは変更していない。公式模擬問題や試験再現問題は使用せず、公開領域に沿って日本語の独自設問を作成した。

## 件数と領域

|コース|追加|既存との合計|追加の領域別件数|
|---|---:|---:|---|
|Generative AI Leader|70|100|d1:21 / d2:24 / d3:14 / d4:11|
|Cloud Digital Leader|70|100|d1:13 / d2:13 / d3:13 / d4:13 / d5:11 / d6:7|

GAIは学習方式、データ準備と品質、推論、コンテキスト、業務用途、事前構築API、エージェント、プロンプト設計、評価、導入効果と責任を補った。CDLはネットワークとサービス形態、データ管理、ML用途、移行方針、API、セキュリティの基本、運用目標と費用を補った。全領域を含むが、問数は出題比率の完全再現ではない。

## 実際に開いて確認した公式資料

- [GAI exam guide](https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf): 4領域、Google Cloud製品の現行名称、プロンプト技法、導入と責任あるAIの範囲を確認。
- [CDL exam guide](https://services.google.com/fh/files/misc/cloud_digital_leader_exam_guide_english.pdf): 6領域。取得した文書には2026-08-12開始版の記載がある。移行分類、データ品質、セキュリティ、運用の範囲を確認。
- [Google Cloud overview](https://docs.cloud.google.com/docs/overview): リージョン、ゾーン、配置と遅延、サービスの概要。
- [Generative AI beginner's guide](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/beginners-guide): マルチモーダル、外部情報アクセス、関数呼び出し、チューニング、安全フィルタ。旧vertex-ai URLから現行URLへの転送を確認。
- [Introduction to prompting](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/prompts/introduction-prompt-design): タスク、指示、例、文脈という構成。公開サンプルの設問は転用していない。
- [Storage classes](https://docs.cloud.google.com/storage/docs/storage-classes): Standard、Archive、最低保存期間、取り出し料金、Autoclass。
- [Well-Architected Framework](https://docs.cloud.google.com/architecture/framework): 運用、信頼性、費用最適化、持続可能性の観点。
- [Text-to-Speech basics](https://docs.cloud.google.com/text-to-speech/docs/basics): テキストやSSMLから音声を生成する機能。
- [Natural Language API basics](https://docs.cloud.google.com/natural-language/docs/basics): 感情分析などの文章解析。
- [Dataflow overview](https://docs.cloud.google.com/dataflow/docs/overview): Beamを使うデータ処理基盤。
- [AlloyDB overview](https://docs.cloud.google.com/alloydb/docs/overview): PostgreSQL互換データベース。
- [Sensitive Data Protection](https://cloud.google.com/security/products/sensitive-data-protection): 機密情報の発見・分類・保護。
- [Cloud Armor overview](https://docs.cloud.google.com/armor/docs/cloud-armor-overview): DDoSおよびアプリケーション攻撃への保護。

各行は7要素で、最後に公式URL配列を保持する。試験ガイドは領域の裏付けであり、全設問の文章や答えがそこに直接掲載されているという意味ではない。上記の具体的なサービス資料は対応カードにも追加した。

## 検証と留意点

Node.jsによるモジュール読み込み、各追加70行、既存を合わせ各100行、7要素の形、必須文字列、sources配列、既存を含むコース内の設問完全一致重複なしを確認した。類義の言い換えで水増ししないよう、既存で用語を問う項目は判断基準や異なる機能を優先した。役割・API名などは基礎レベルに限定し、価格、モデル版番号、地域別の提供条件など変動しやすい値は設問化していない。

ガイドの現行表記に合わせ、Gemini Enterprise Agent Platform / Agent Studio / Agent Searchを使用した。既存資料のVertex AI表記との対応は今後も確認が必要。一般概念の短い解説は教育用の要約であり、実環境の詳細な設計手順や合格保証ではない。画面・統合テストと既存ID保持の確認は親タスクで実施する。

独立レビュー後、GAI追加45問目（結合後75番）の製品同定問題を、管理されたRAGでも残るデータ管理責任の問題へ差し替えた。既存の企業検索問題との論点重複を解消し、追加件数は維持した。
