# AWS Architect content review

確認日: 2026-10-25。既存SAA 34問・SAP 30問の配列内容とIDを保持した。

## 件数と領域

| コース | 既存 | 追加 | 合計 | d1 | d2 | d3 | d4 |
|---|---:|---:|---:|---:|---:|---:|---:|
| SAA-C03 | 34 | 66 | 100 | 30 | 26 | 24 | 20 |
| SAP-C02 | 30 | 70 | 100 | 26 | 29 | 25 | 20 |

公式試験ガイドの領域を確認し、最終件数を領域比率に合わせた。これは学習範囲の整理であり、本試験形式・出題傾向・合格を保証するものではない。

- [SAA-C03 guide](https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html)
- [SAP-C02 guide](https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-02/solutions-architect-professional-02.html)

SAAはIAM・暗号化・ネットワーク制御、キュー・復旧、ストレージ・キー設計、課金に影響する選択を追加。
SAPは組織の委任と分離、集中検査、整合性・補償処理、DR制約、既存系の改善、CDC切替・ロールバック・新旧モデルの分離を追加した。条件を与えた設計判断として独自に執筆し、公式サンプル問題や試験ダンプは使用していない。

## レビューと検証

- node --checkで両JSの構文を確認。
- Nodeのassertで各100件、ID一意、質問文の完全一致重複なし、追加行の8要素スキーマ・空欄なし・有効領域・公式URLを確認。
- git show HEADの配列を評価し、先頭の既存34問・30問とJSON完全一致を確認。
- 追加時に既存最終行の末尾カンマが欠ける問題を検出し修正済み。
- SAA d2-20はゾーナルNAT維持を前提として限定。リージョナルNATの存在を確認済み。
- SAA d3-21はWindows Server基盤を明記し、SMB/AD対応だけによる曖昧さを除去。
- SAA d4-16は既存のAthenaパーティション問題から離れ、クエリ単位スキャン上限とキャンセル時の課金に変更。
- SAA d4-17は既存のS3エンドポイント問題から離れ、S3 Bucket Keysの費用削減に変更。
- SAPのoutbox重複を避け、移行領域の1問をAnti-corruption layerへ変更。
- 価格の具体値、最大容量・最大性能の数値を新規問題には固定していない。

## 留意点と境界

- 既存行の内容は変更対象外。既存の試験世代・確認日・コース説明の更新は統合担当に委ねる。
- 実際のAWSアカウントでの構築・性能測定は実施していない。設計判断は記載した条件下での学習用。
- 対応エンジン・リージョンなどは実装時に再確認する。DynamoDBグローバルテーブルはMRECを明示し、MRSCへ一般化していない。
- 取得失敗した仮URL（IAM access_policies_evaluation-logic、VPC vpc-security、reliability auto_healing、cloud-design-patterns/database-per-service）は採用していない。正式URLを再検索して差し替えた。
- 各追加行に付けた下記一次資料はブラウズで実際に取得した。ドキュメント上の説明を学習用の条件・判断へ落とし込み、文面を転載していない。
- リポジトリ全体のテストは統合担当が実施する。

## 確認した採用資料と対応ID

- [reference_policies_evaluation-logic.html](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html) — aws-saa-d1-13
- [access_policies_boundaries.html](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html) — aws-saa-d1-14, aws-sap-d1-15
- [id_roles_common-scenarios_third-party.html](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html) — aws-saa-d1-15, aws-sap-d1-16
- [security-best-practices.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html) — aws-saa-d1-16
- [about-object-ownership.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html) — aws-saa-d1-17, aws-sap-d1-17
- [using-presigned-url.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) — aws-saa-d1-18
- [private-content-restricting-access-to-s3.html](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) — aws-saa-d1-19
- [rotating-secrets.html](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html) — aws-saa-d1-20
- [session-manager.html](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html) — aws-saa-d1-21
- [vpc-security-groups.html](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html) — aws-saa-d1-22, aws-saa-d1-23
- [vpc-network-acls.html](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html) — aws-saa-d1-24, aws-saa-d1-25
- [what-is-macie.html](https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html) — aws-saa-d1-26
- [what-is-guardduty.html](https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html) — aws-saa-d1-27
- [logging-data-events-with-cloudtrail.html](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html) — aws-saa-d1-28
- [object-lock.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html) — aws-saa-d1-29, aws-sap-d1-18
- [UsingKMSEncryption.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html) — aws-saa-d1-30
- [vpc-endpoints-access.html](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html) — aws-saa-d1-31
- [cognito-user-pools.html](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html) — aws-saa-d1-32
- [sqs-fifo-queues.html](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html) — aws-saa-d2-11, aws-sap-d2-13
- [sqs-visibility-timeout.html](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html) — aws-saa-d2-12
- [sqs-dead-letter-queues.html](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html) — aws-saa-d2-13
- [standard-queues-at-least-once-delivery.html](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html) — aws-saa-d2-14
- [rel_mitigate_interaction_failure_stateless.html](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_stateless.html) — aws-saa-d2-15
- [whatisefs.html](https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html) — aws-saa-d2-16, aws-sap-d2-20
- [ebs-restoring-volume.html](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-restoring-volume.html) — aws-saa-d2-17
- [health-checks-overview.html](https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-checks-overview.html) — aws-saa-d2-18
- [lifecycle-hooks.html](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html) — aws-saa-d2-19, aws-sap-d3-12
- [nat-gateways-regional.html](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html) — aws-saa-d2-20
- [USER_PIT.html](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html) — aws-saa-d2-21
- [disaster-recovery-options-in-the-cloud.html](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html) — aws-saa-d2-22, aws-saa-d2-25, aws-sap-d2-14, aws-sap-d2-15, aws-sap-d2-16, aws-sap-d2-24, aws-sap-d2-26, aws-sap-d3-18
- [high_availability_origin_failover.html](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/high_availability_origin_failover.html) — aws-saa-d2-23
- [retry-backoff.html](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html) — aws-saa-d2-24, aws-sap-d2-27, aws-sap-d3-13
- [timeouts-retries-and-backoff-with-jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) — aws-saa-d2-24, aws-sap-d3-13
- [services-sqs-errorhandling.html](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html) — aws-saa-d2-26
- [mpuoverview.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html) — aws-saa-d3-11
- [optimizing-performance-guidelines.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance-guidelines.html) — aws-saa-d3-12
- [Introduction.html](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html) — aws-saa-d3-13
- [introduction.html](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html) — aws-saa-d3-14
- [introduction.html](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html) — aws-saa-d3-15
- [bp-partition-key-sharding.html](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html) — aws-saa-d3-16, aws-sap-d3-17
- [GSI.html](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html) — aws-saa-d3-17
- [HowItWorks.ReadConsistency.html](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html) — aws-saa-d3-18
- [rds-proxy.html](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html) — aws-saa-d3-19, aws-sap-d2-18
- [instance-types.html](https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-types.html) — aws-saa-d3-20
- [what-is.html](https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html) — aws-saa-d3-21
- [what-is.html](https://docs.aws.amazon.com/fsx/latest/LustreGuide/what-is.html) — aws-saa-d3-22
- [as-using-sqs-queue.html](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html) — aws-saa-d3-23, aws-sap-d2-23, aws-sap-d3-11
- [ec2-auto-scaling-scheduled-scaling.html](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html) — aws-saa-d3-24
- [configuration-memory.html](https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html) — aws-saa-d3-25, aws-sap-d3-10
- [controlling-the-cache-key.html](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html) — aws-saa-d3-26, aws-sap-d2-22, aws-sap-d3-16
- [storage-class-intro.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html) — aws-saa-d4-09, aws-saa-d4-10, aws-saa-d4-11
- [mpu-abort-incomplete-mpu-lifecycle-config.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpu-abort-incomplete-mpu-lifecycle-config.html) — aws-saa-d4-12
- [lifecycle-transition-general-considerations.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html) — aws-saa-d4-13
- [Stop_Start.html](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html) — aws-saa-d4-14
- [sqs-short-and-long-polling.html](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html) — aws-saa-d4-15
- [workgroups-setting-control-limits-cloudwatch.html](https://docs.aws.amazon.com/athena/latest/ug/workgroups-setting-control-limits-cloudwatch.html) — aws-saa-d4-16
- [bucket-key.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html) — aws-saa-d4-17
- [what-is-savings-plans.html](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html) — aws-saa-d4-18
- [budgets-managing-costs.html](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html) — aws-saa-d4-19
- [general-purpose.html](https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html) — aws-saa-d4-20
- [ebs-deleting-volume.html](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-deleting-volume.html) — aws-saa-d4-21
- [welcome.html](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html) — aws-saa-d4-22, aws-sap-d3-24
- [how-transit-gateways-work.html](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html) — aws-sap-d1-27, aws-sap-d1-09
- [privatelink-share-your-services.html](https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-share-your-services.html) — aws-sap-d1-10
- [configure-endpoint-service.html](https://docs.aws.amazon.com/vpc/latest/privatelink/configure-endpoint-service.html) — aws-sap-d1-11
- [orgs_manage_policies_scps.html](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html) — aws-sap-d1-12, aws-sap-d1-13, aws-sap-d1-14
- [aggregate-data.html](https://docs.aws.amazon.com/config/latest/developerguide/aggregate-data.html) — aws-sap-d1-19
- [resolver-rules-managing.html](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-rules-managing.html) — aws-sap-d1-20
- [vpc-sharing.html](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-sharing.html) — aws-sap-d1-21
- [encryption-in-transit.html](https://docs.aws.amazon.com/directconnect/latest/UserGuide/encryption-in-transit.html) — aws-sap-d1-22
- [VPC_VPN.html](https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html) — aws-sap-d1-23
- [reference_policies_condition-keys.html](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html) — aws-sap-d1-24
- [key-policy-modifying-external-accounts.html](https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html) — aws-sap-d1-25
- [cloudtrail-log-file-validation-intro.html](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html) — aws-sap-d1-26
- [transactional-outbox.html](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) — aws-sap-d2-10
- [saga-orchestration.html](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-orchestration.html) — aws-sap-d2-11
- [circuit-breaker.html](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html) — aws-sap-d2-12
- [V2globaltables_HowItWorks.html](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html) — aws-sap-d2-17
- [Concepts.MultiAZSingleStandby.html](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html) — aws-sap-d2-19
- [PrivateContent.html](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html) — aws-sap-d2-21
- [vault-lock.html](https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html) — aws-sap-d2-25, aws-sap-d3-19
- [bp-general-nosql-design.html](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html) — aws-sap-d2-28
- [InstanceStorage.html](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html) — aws-sap-d2-29
- [CHAP_BestPractices.html](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html) — aws-sap-d3-09
- [cache-validity.html](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/cache-validity.html) — aws-sap-d3-14
- [gateway-endpoints.html](https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html) — aws-sap-d3-15
- [access-analyzer-policy-generation.html](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html) — aws-sap-d3-20
- [asg-instance-refresh.html](https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-instance-refresh.html) — aws-sap-d3-21
- [rel_monitor_aws_resources_automate_response_monitor.html](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_monitor_aws_resources_automate_response_monitor.html) — aws-sap-d3-22
- [best-practices.html](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html) — aws-sap-d3-23
- [sqs-available-cloudwatch-metrics.html](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html) — aws-sap-d3-25
- [what-is.html](https://docs.aws.amazon.com/fis/latest/userguide/what-is.html) — aws-sap-d3-26
- [strangler-fig.html](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html) — aws-sap-d4-08, aws-sap-d4-09
- [CHAP_BestPractices.html](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_BestPractices.html) — aws-sap-d4-10, aws-sap-d4-11, aws-sap-d4-13, aws-sap-d4-14, aws-sap-d4-15, aws-sap-d4-16
- [CHAP_Validating.html](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html) — aws-sap-d4-12
- [chap-oracle2postgresql.rollback.html](https://docs.aws.amazon.com/dms/latest/sbs/chap-oracle2postgresql.rollback.html) — aws-sap-d4-17
- [database-per-service.html](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/database-per-service.html) — aws-sap-d4-18
- [configure-metadata.html](https://docs.aws.amazon.com/datasync/latest/userguide/configure-metadata.html) — aws-sap-d4-19
- [acl.html](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/acl.html) — aws-sap-d4-20

