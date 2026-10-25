# Independent content audit — 2026-10-25

Read-only audit of question content during the expansion. No content, index, UI, or test files were edited by this reviewer. Findings below describe the versions inspected; the author may subsequently resolve them.

## Coverage and limits

- AIF-C01: all 65 new rows read with answers and explanations; compared against 35 existing rows.
- CLF-C02: all 61 new rows read with answers and explanations; compared against 39 existing rows.
- GCP ACE: all 70 new rows and their explanations read; compared against the original 30.
- GCP GAI/CDL: all 70 new questions, answers, and full explanations per course read, including a final supplementary pass over all 140 explanations and their listed references. Original rows were consulted for overlap.
- GCP PCA: all 70 new questions, answers, and explanations read. General architecture plausibility review, not a comprehensive official-source check of every claim.
- Claude: all 68 new rows read alongside the original 32. Selected streaming/batch claims verified against official documentation.
- SAA/SAP: subsequently read all 66/70 new questions, answers, and explanations and compared their learning objectives against the 34/30 existing rows. Both files now contain 100 rows. Total additions reviewed across the nine courses: 610.
- This is a manual semantic review, not an assertion that every linked source was retrieved or that the bank reproduces exam difficulty. No clear factual error was found in the reviewed additions. Ambiguity and overlap findings follow.

## Clarify before relying on a unique answer

**Resolved:** Both CLF findings below were corrected by the author and the changed files were independently reread. CLF d3-19 now specifies Windows Server as its underlying platform; d3-25 now names Spark/Hive/HBase and a managed big-data platform.

1. **aws-clf-d3-25**: “Apache Sparkなどのビッグデータフレームワークで処理を行うAWSサービスは？” → EMR. Glue also offers Spark execution. Specify the managed big-data platform with Spark, Hive, HBase and other open-source frameworks, rather than Spark alone. [AWS analytics overview](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/analytics.html) explicitly describes both EMR and Glue Spark support.
2. **aws-clf-d3-19**: SMB plus Active Directory and Windows clients does not uniquely identify FSx for Windows File Server; FSx for ONTAP meets those conditions too. Add native Windows File Server compatibility/implementation to the requirement. [FSx for ONTAP getting started](https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/getting-started.html) documents AD-joined SVMs enabling SMB access for Windows clients.

## Strong overlap candidates

**Resolved:** The three findings in this section were corrected and reread. ACE d3-84 now tests an explicit `--project=prod` override without changing the saved configuration. GAI d2-75 now tests continuing data freshness/access-management responsibility with managed RAG. Claude d5-81 now tests the meaning and handling of `expired` batch results. The current official Batch documentation confirms expiration before model submission and no billing for these requests.

- **gcp-ace-d1-31 / gcp-ace-d3-84**: both select/switch named gcloud configurations for development versus production. The second supplies the command but mostly repeats the first learning objective. Replace the later question with a single-command `--configuration` override scenario that must leave the default active configuration unchanged. [Official configurations documentation](https://cloud.google.com/sdk/docs/configurations) supports this distinct behavior.
- **claude-ccdvf-d2-06 / claude-ccdvf-d5-81**: both select Batch for delayed, large-scale classification. Replace the later question with handling individual `expired` outcomes after the 24-hour processing window. [Official Batch documentation](https://platform.claude.com/docs/en/build-with-claude/batch-processing) describes expiration and individual request results.
- **gcp-gai-d2-19 / gcp-gai-d2-75**: enterprise search versus managed RAG both identify Agent Search, with little different decision work. Consider replacing the later item with the operational responsibility tradeoff between managed retrieval and a custom retrieval pipeline, verified against the chosen official guide.

Related but distinct items such as ACE GKE keyless authentication versus per-workload authorization were not treated as automatic duplicates. Service selection, permissions, and failure handling can legitimately revisit the same product.

## Coverage observations

- AWS additions largely add distinct concepts/services rather than paraphrase padding. AIF MCP, context engineering, memory, multi-agent systems, underfitting, and subgroup analysis are explicitly supported by the current [domain 2](https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01-domain2.html) and [domain 4](https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01-domain4.html) guides; these must not be rejected using an older remembered syllabus.
- Claude counts inspected: d1 14, d2 29, d3 6, d4 6, d5 15, d6 11, d7 8, d8 11. The repository weights are 14.7/33.1/3.1/2.6/16.8/11/8.1/10.6. Thus Code and evaluation are overrepresented, and integration somewhat underrepresented. This is acceptable for a practice bank if not presented as an exam-proportional mock exam. Many distractors are conspicuously implausible, so count alone does not imply exam-level difficulty.
- PCA additions cover useful architecture reasoning, reliability, release, security, and cost scenarios, but many are provider-neutral. GCP-specific multi-requirement service tradeoffs and case-study integration remain lighter. The course notice appropriately says it is knowledge practice rather than a reproduction of standard exam case studies.

## Additional spot verification

[Claude streaming documentation](https://platform.claude.com/docs/en/build-with-claude/streaming) confirms cumulative `message_delta` usage and errors inside an already-open stream, supporting those new rows. Official AWS and Claude sources above were retrieved during this review. The final supplementary pass retrieved the current GAI/CDL official guides and confirmed their use of Agent Platform, Agent Studio, and Conversational product names. This remains selective source verification, not a claim that every reference or all exam-guide percentages were independently revalidated.

### GAI/CDL explanation supplement

All 140 additional explanations were read in full. No clear answer/explanation contradiction or technical falsehood was found. The current [GAI guide](https://services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf) and [CDL guide](https://services.google.com/fh/files/misc/cloud_digital_leader_exam_guide_english.pdf) cover the corresponding topic areas. Many references are syllabus references rather than detailed proof of every explanatory sentence; product-specific checks included the Agent Platform beginner guide, Storage classes, and AlloyDB overview.

One minor answer-uniqueness refinement was reported: **gcp-cdl-d2-51**, “PostgreSQL互換で、高負荷の企業向けワークロードに対応するGoogle CloudのDBサービスは？” does not decisively exclude Cloud SQL. AlloyDB is a valid answer and its linked source is correct, but adding its Google-built engine and columnar analytical-query acceleration would make the distinction concrete. [AlloyDB overview](https://docs.cloud.google.com/alloydb/docs/overview) supports those differentiators; [Cloud SQL overview](https://docs.cloud.google.com/sql/docs/postgres/introduction) confirms the competing managed PostgreSQL offering. This is a wording recommendation, not a false-answer finding. Status: reported for author consideration; content code was not edited by this reviewer.

## SAA/SAP follow-up findings

All 136 additional rows were read. No clear false answer found in SAP additions. **Resolved:** All four SAA refinements below were implemented by the author and independently reread against official documentation. No item-specific correction remains pending from this review.

Final verification: d2-20 explicitly retains the zonal NAT design and distinguishes regional NAT; d3-21 specifies Windows Server as the underlying platform; d4-16 now tests Athena per-query scan cancellation, including charges for data already scanned; d4-17 now tests S3 Bucket Keys reducing KMS requests for new SSE-KMS objects, without automatic retroactive application. These changes resolve the ambiguity/overlap findings below. Sources: [regional NAT](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html), [FSx Windows](https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html), [Athena controls](https://docs.aws.amazon.com/athena/latest/ug/workgroups-setting-control-limits-cloudwatch.html), [S3 Bucket Keys](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html).

Historical findings, retained for traceability:

- **aws-saa-d2-20**: the current question asks about two AZs sharing one NAT Gateway and answers one gateway per AZ. Explicitly say **zonal NAT Gateway** and constrain the redesign to that type. Regional NAT gateways now automatically expand across AZs, so the conventional answer should not be generalized to every NAT gateway. [Official regional NAT documentation](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html) was checked.
- **aws-saa-d3-21**: Windows-compatible file sharing, SMB and AD still overlap FSx for ONTAP. As with the resolved CLF item, add **Windows Server as the underlying platform** to uniquely identify FSx for Windows File Server.
- **aws-saa-d4-16 / existing aws-saa-d3-09**: selecting date partitions to reduce Athena scanning revisits the existing partitioning/columnar-format objective. Prefer a concrete partition-pruning pitfall or implementation condition in the new item.
- **aws-saa-d4-17 / existing aws-saa-d3-10**: both choose the S3 gateway endpoint to bypass NAT. The new cost framing is useful but adds little decision work; prefer a distinct endpoint constraint or operational tradeoff.

The two overlap items are editorial quality recommendations, not factual errors. SAP includes more concrete failure/tradeoff reasoning than a simple product glossary; cross-course recurrence (for example FIFO message groups appearing in SAA and SAP) was not treated as duplication within one course.

Integration follow-up: gcp-cdl-d2-51 was clarified with the Google-built PostgreSQL-compatible engine and columnar analytical engine, after fetching the linked official AlloyDB overview. The ambiguity finding is resolved.
