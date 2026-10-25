# GCP ACE / PCA 追加問題レビュー

確認日: 2026-10-25。対象は `lib/content/gcp/extra-professional.js`。公開試験ガイドの領域に対応する日本語の独自シナリオを追加した。実試験問題やケーススタディの転載・再現ではない。

## 件数と領域

| コース | 既存 | 追加 | 合計 | 追加の領域別件数 |
| --- | ---: | ---: | ---: | --- |
| Associate Cloud Engineer | 30 | 70 | 100 | d1:14 / d2:21 / d3:21 / d4:14 |
| Professional Cloud Architect | 30 | 70 | 100 | d1:18 / d2:12 / d3:12 / d4:10 / d5:9 / d6:9 |

ACEは環境設定、CLI、課金、ネットワーク、MIG、GKE、SQL、メッセージング、ログ、アクセス管理を扱う。PCAはDR、容量、縮退、非同期化、移行、接続、暗号鍵、配信、費用評価、運用改善を扱う。配分は既存の領域に合わせた追加分の目安であり、試験の出題比率や全論点の網羅を保証しない。

各行は既存形式の6項目に公式URLの配列を7項目目として追加する。試験ガイドと論点別資料を保持し、同一URLは重複除去する。ID生成とcheckedAt付与は統合側で行う。

## 実施した確認

- Node.jsの `--check` で構文検証した。
- require後の配列で各70問、7項目、空文字なし、公式ドメインのHTTPS出典を検査した。
- 既存各30問を合わせ、質問文字列は各100件すべて一意だった。UTF-8の置換文字も含まない。
- 既存の製品名だけを問う問題と区別し、要件・制約・障害状況を含めた判断を加えた。
- 意味の重複を見直し、CLI構成切替の再出題は「フラグがプロパティより優先する」へ変更した。GKEの鍵不要認証の再出題はPolicy Troubleshooterへ変更した。
- クォータの固定値、価格、SLAの固定割合、変更されやすい提供上限を暗記させる問題は追加していない。
- 文書の取得と重要箇所の検索・本文確認を実施した。特にCLI優先順位、MIG修復、ライフサイクルと保持の関係、KMSローテーション、Cloud Deploy承認、Cloud Armorプレビュー、Pub/Sub滞留指標を確認した。

## 確認した公式出典

追加行が参照するURLは42件。以下のページをブラウズし、試験ガイドの領域とサービスの説明を参照した。cloud.google.comからdocs.cloud.google.comへの公式リダイレクトがある。公開ドキュメントの参照であり、実サービスへの接続・構築検証は実施していない。

- [ACE試験ガイド](https://services.google.com/fh/files/misc/associate_cloud_engineer_exam_guide_english.pdf)
- [PCA試験ガイド](https://services.google.com/fh/files/misc/professional_cloud_architect_exam_guide_english.pdf)
- [gcloud configurations](https://cloud.google.com/sdk/docs/configurations)
- [gcloud properties](https://cloud.google.com/sdk/docs/properties)
- [Billingエクスポート](https://cloud.google.com/billing/docs/how-to/export-data-bigquery)
- [Workforce Identity Federation](https://cloud.google.com/iam/docs/workforce-identity-federation)
- [Cloud Asset Inventory](https://cloud.google.com/asset-inventory/docs/overview)
- [IAM概要](https://cloud.google.com/iam/docs/overview)
- [Policy Troubleshooter](https://cloud.google.com/iam/docs/troubleshooting-access)
- [VPC](https://cloud.google.com/vpc/docs/vpc)
- [VPC Peering](https://cloud.google.com/vpc/docs/vpc-peering)
- [Interconnect](https://cloud.google.com/interconnect/docs/concepts/overview)
- [Instance groups](https://cloud.google.com/compute/docs/instance-groups)
- [Cloud Runコンテナ](https://cloud.google.com/run/docs/configuring/services/containers)
- [GKEクラスタオートスケーラー](https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler)
- [Workload Identity Federation for GKE](https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity)
- [Cloud SQL HA](https://cloud.google.com/sql/docs/postgres/high-availability)
- [Cloud SQL PITR](https://cloud.google.com/sql/docs/postgres/backup-recovery/pitr)
- [BigQuery最適化](https://cloud.google.com/bigquery/docs/best-practices-performance-compute)
- [Pub/Sub受信方式](https://cloud.google.com/pubsub/docs/subscriber)
- [Pub/Sub Pull](https://cloud.google.com/pubsub/docs/pull)
- [Pub/Subデッドレター](https://cloud.google.com/pubsub/docs/handling-failures)
- [Pub/Sub監視](https://cloud.google.com/pubsub/docs/monitoring)
- [均一なバケットレベルのアクセス](https://cloud.google.com/storage/docs/uniform-bucket-level-access)
- [オブジェクトライフサイクル](https://cloud.google.com/storage/docs/lifecycle)
- [Bucket Lock](https://cloud.google.com/storage/docs/bucket-lock)
- [再試行戦略](https://cloud.google.com/storage/docs/retry-strategy)
- [Secret Manager](https://cloud.google.com/secret-manager/docs/overview)
- [ログルーティング](https://cloud.google.com/logging/docs/routing/overview)
- [ヘルスチェック](https://cloud.google.com/load-balancing/docs/health-check-concepts)
- [Ops Agent](https://cloud.google.com/monitoring/agent/ops-agent)
- [災害復旧設計](https://cloud.google.com/architecture/disaster-recovery)
- [Well-Architected Framework](https://cloud.google.com/architecture/framework)
- [信頼性](https://cloud.google.com/architecture/framework/reliability)
- [機能縮退](https://cloud.google.com/architecture/framework/reliability/graceful-degradation)
- [費用最適化](https://cloud.google.com/architecture/framework/cost-optimization)
- [運用の卓越性](https://cloud.google.com/architecture/framework/operational-excellence)
- [KMS鍵ローテーション](https://cloud.google.com/kms/docs/key-rotation)
- [Binary Authorization](https://cloud.google.com/binary-authorization/docs/overview)
- [Cloud Armor概要](https://cloud.google.com/armor/docs/cloud-armor-overview)
- [Cloud Armorポリシー](https://cloud.google.com/armor/docs/security-policy-overview)
- [Cloud Deploy](https://cloud.google.com/deploy/docs/overview)

## 解釈上の限界

PCAの移行・受入・運用判断の一部は試験ガイドの評価対象を独自の要件へ適用した設計判断であり、公式資料に同じ設問や唯一の設計が記載されているという意味ではない。設問内の条件を外せば他の解決策も成立する。リージョン可用性、製品エディション、APIの対応、権限、組織ポリシーは実際の導入時に再確認する必要がある。

アプリ全体の統合テストは親作業で実施する。既存cards.js、index.js、テストの変更、コミット、プッシュ、クラウド操作はこの担当では行っていない。
