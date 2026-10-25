# AWS foundational content review

Reviewed 2026-10-25.

| Exam | Before | Added | After | Domain coverage |
|---|---:|---:|---:|---|
| AIF-C01 |35|65|100|20/24/28/14/14|
| CLF-C02 |39|61|100|24/30/34/12|

Existing rows/IDs preserved. Original Japanese recall questions, one expected answer, short explanation and official URL per question. Coverage follows official domain proportions, without claiming exhaustive objective coverage. No dumps, sample-question copying, exact changing prices or quotas.

## Official pages actually checked

- https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01-domain1.html
- https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01-domain2.html
- https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01-domain3.html
- https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01-domain4.html
- https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01-domain5.html
- https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html
- https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html
- https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/consolidated-billing.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/custom-models.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/inference-parameters.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html
- https://docs.aws.amazon.com/machine-learning/latest/dg/binary-model-insights.html
- https://docs.aws.amazon.com/machine-learning/latest/dg/types-of-ml-models.html
- https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/migration-strategies.html
- https://docs.aws.amazon.com/pricing-calculator/latest/userguide/what-is-pricing-calculator.html
- https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-model-monitor-bias-drift.html
- https://docs.aws.amazon.com/whitepapers/latest/aws-overview/analytics.html
- https://docs.aws.amazon.com/whitepapers/latest/aws-overview/application-integration.html
- https://docs.aws.amazon.com/whitepapers/latest/aws-overview/aws-cost-management.html
- https://docs.aws.amazon.com/whitepapers/latest/aws-overview/compute-services.html
- https://docs.aws.amazon.com/whitepapers/latest/aws-overview/database.html
- https://docs.aws.amazon.com/whitepapers/latest/aws-overview/machine-learning.html
- https://docs.aws.amazon.com/whitepapers/latest/aws-overview/management-governance.html
- https://docs.aws.amazon.com/whitepapers/latest/aws-overview/security-services.html
- https://docs.aws.amazon.com/whitepapers/latest/aws-overview/six-advantages-of-cloud-computing.html
- https://docs.aws.amazon.com/whitepapers/latest/aws-overview/storage-services.html

Also opened the two main exam-guide pages, Bedrock overview, AWS services-by-category overview, and IAM access_policies.html, id_groups.html and reference_policies_evaluation-logic.html.

## Verification and limitations

Both files pass node --check. Node checks confirm 100 questions each, unique IDs/questions, required fields and HTTPS sources. Deep equality against HEAD confirms all original rows unchanged. Existing CLF d3-12 has an array source field; it remains unchanged. No commits or pushes.

The current AIF guide includes MCP, context engineering and multi-agent concepts; these are included at recognition level. Legacy Amazon ML docs support timeless metric/classification definitions, not service adoption recommendations. The SageMaker bias-drift page notes Model Monitor is closed to new customers; the added question addresses monitoring fairness conceptually, not enrolling in that service. One supplemental continued-pretraining service page was inaccessible; the relevant question instead cites the opened domain 3 guide. Existing rows were not re-reviewed. Parent task handles checkedAt/schema integration.

Automatic review denied an optional script to replace sources for four new IAM rows as an alleged existing-row mutation. Read-only HEAD checks proved d2-13/16/17/18 were newly added. The denied mutation was abandoned; their valid domain-guide sources remain, and supplemental IAM docs were read. No blocker remains. Independent review ambiguity fixes: EMR prompt now specifies Spark/Hive/HBase managed platform; FSx prompt now specifies Windows Server basis and native Windows features.
