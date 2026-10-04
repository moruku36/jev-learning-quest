'use strict';

// Curated from first-party AI Village poster abstracts presented at DEF CON 34.
// Conference material is a technical leading signal, not incident-prevalence data.
// Program/event pages without a readable abstract or paper are intentionally excluded.
const CONFERENCE_READINGS = [
  {
    id: 'defcon34-mcparasite-agent-worm',
    org: 'AI Village / DEF CON 34',
    title: 'Agent-to-Agent Worm Propagation in MCP-Based AI Systems',
    kind: '研究ポスター', year: 2026,
    url: 'https://aivillage.org/posters/agent-to-agent-worm-propagation-in-mcp-based-ai-systems/',
    minutes: 20, level: '中級',
    focus: '共有チャネルを介して攻撃者制御のコンテキストが別のAIエージェントに伝播し、異なる権限のツール操作を誘発する条件と、伝播を断つ防御策。',
    task: '実験条件と成功判定を整理し、コンテキスト分離・権限最小化・操作承認・ツール呼出ログのうち自組織で先に検証する対策を1つ選ぶ。',
    evidenceType: 'conference_poster_abstract', eventStartDate: '2026-08-06', eventEndDate: '2026-08-09', lastVerifiedAt: '2026-10-04'
  },
  {
    id: 'defcon34-modelshield-malicious-models',
    org: 'AI Village / DEF CON 34',
    title: 'The Model Is the Malware: Runtime Behavioral Detection of Malicious ML Artifacts',
    kind: '研究ポスター', year: 2026,
    url: 'https://aivillage.org/posters/the-model-is-the-malware-runtime-behavioral-detection-of-malicious-ml/',
    minutes: 25, level: '上級',
    focus: 'モデルartifactの静的検査だけでなく、ロード時のAPI挙動とOSレベルの動作を帰属させて悪性モデルを検出するModelShieldの仕組みと評価。',
    task: 'モデルを取得・評価・配置する経路を図示し、実行時検知とモデルの出所検証をどこに加えるべきかを提案する。',
    evidenceType: 'conference_poster_abstract', eventStartDate: '2026-08-06', eventEndDate: '2026-08-09', lastVerifiedAt: '2026-10-04'
  },
  {
    id: 'defcon34-poisoning-soc-telemetry',
    org: 'AI Village / DEF CON 34',
    title: 'Poisoning the SOC: Prompt Injection via Ingested Telemetry',
    kind: '研究ポスター', year: 2026,
    url: 'https://aivillage.org/posters/poisoning-the-soc-prompt-injection-via-ingested-telemetry/',
    minutes: 20, level: '中級',
    focus: '攻撃者が書き込めるログフィールドからSOCのLLM agentへ指示が到達する経路と、現実のSIEM・agent pipeline上での影響範囲。',
    task: 'ログを読むAI機能を1つ選び、データと指示の境界、攻撃者が制御できるフィールド、許されるツール操作を点検する。',
    evidenceType: 'conference_poster_abstract', eventStartDate: '2026-08-06', eventEndDate: '2026-08-09', lastVerifiedAt: '2026-10-04'
  },
  {
    id: 'defcon34-agent-ci-cd-privilege-boundaries',
    org: 'AI Village / DEF CON 34',
    title: "I'll Just Call You: Agent-to-Agent Privilege Boundary Failures in CI/CD Agents",
    kind: '研究ポスター', year: 2026,
    url: 'https://aivillage.org/posters/ill-just-call-you-agent-to-agent-privilege-boundary-failures-in-ci-cd/',
    minutes: 25, level: '上級',
    focus: 'repository内容へのprompt injectionで低権限agentから別の高権限CI/CD agentを起動させる連鎖と、agent identity・token権限・trigger条件のリスク。',
    task: 'CI/CD内のagent間トリガーを洗い出し、信頼できない入力から高権限処理へ到達できる経路を1つ特定する。',
    evidenceType: 'conference_poster_abstract', eventStartDate: '2026-08-06', eventEndDate: '2026-08-09', lastVerifiedAt: '2026-10-04'
  },
  {
    id: 'defcon34-prompt-injection-testing-scale',
    org: 'AI Village / DEF CON 34',
    title: 'Prompt Injection Testing at Scale',
    kind: '研究ポスター', year: 2026,
    url: 'https://aivillage.org/posters/prompt-injection-testing-at-scale/',
    minutes: 20, level: '中級',
    focus: '手動red teamだけでは追いつかないagentのprompt injectionリスクに対し、継続的な自動敵対テストを開発工程に組み込む考え方。',
    task: '自組織のAI機能に対するprompt injection回帰テストを1件設計し、リリース判定で見る結果を定義する。',
    evidenceType: 'conference_poster_abstract', eventStartDate: '2026-08-06', eventEndDate: '2026-08-09', lastVerifiedAt: '2026-10-04'
  },
  {
    id: 'defcon34-cross-enterprise-agent-identity',
    org: 'AI Village / DEF CON 34',
    title: 'Securing Cross-Enterprise AI Agents',
    kind: '研究ポスター', year: 2026,
    url: 'https://aivillage.org/posters/securing-cross-enterprise-ai-agents/',
    minutes: 20, level: '上級',
    focus: '企業間でagentに権限を委譲するとき、依頼者と実行agentのidentityを伝播させ、各信頼境界で委譲権限を検証・記録する参照設計。',
    task: 'agentが別組織のAPIを呼ぶ設計を想定し、依頼者identity・委譲範囲・監査記録をどう引き継ぐかを図示する。',
    evidenceType: 'conference_poster_abstract', eventStartDate: '2026-08-06', eventEndDate: '2026-08-09', lastVerifiedAt: '2026-10-04'
  },
  {
    id: 'defcon34-intent-based-threat-hunting',
    org: 'AI Village / DEF CON 34',
    title: "Attackers Don't Need Shells, They Need Prompts: This Is How We Hunt Them",
    kind: '研究ポスター', year: 2026,
    url: 'https://aivillage.org/posters/attackers-dont-need-shells-they-need-prompts-this-is-how-we-hunt-them/',
    minutes: 20, level: '中級',
    focus: 'AI agentの脅威ハンティングで、prompt・tool call・retrieval data・model responseといった言語的なsignalを扱うIntent-based Threat Huntingの要点。',
    task: '既存のSOC検知で見落とすagent操作を1つ想定し、意味の近い攻撃表現も拾える観測項目を定義する。',
    evidenceType: 'conference_poster_abstract', eventStartDate: '2026-08-06', eventEndDate: '2026-08-09', lastVerifiedAt: '2026-10-04'
  },
  {
    id: 'defcon34-cdc-aware-rag-poison-containment',
    org: 'AI Village / DEF CON 34',
    title: 'Poison In, Poison Out: CDC-Aware Containment for RAG and Agent Memory',
    kind: '研究ポスター', year: 2026,
    url: 'https://aivillage.org/posters/poison-in-poison-out-cdc-aware-containment-for-rag-and-agent-memory/',
    minutes: 25, level: '上級',
    focus: '汚染されたRAG文書を直した後にも残るchunk・embedding・memory・replayed eventを追跡し、派生データを含めて削除を検証する設計。',
    task: 'RAGデータの訂正・削除要求が原文、vector index、agent memory、ログにどう伝播し完了確認されるかを表にする。',
    evidenceType: 'conference_poster_abstract', eventStartDate: '2026-08-06', eventEndDate: '2026-08-09', lastVerifiedAt: '2026-10-04'
  }
];

module.exports = { CONFERENCE_READINGS };
