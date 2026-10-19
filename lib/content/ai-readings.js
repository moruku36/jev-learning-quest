// AI・クラウド・セキュリティ 大手各社の最新レポート・論文・技術ブログ読書リスト
// GitHub Actions (update-content.yml) により週次で自動更新・ローテーションされます。
// URL はすべて公開ページ（arXiv / 各社公式サイト）。並び順がクエストで提案される優先順になる。
//   focus: 読むときの観点（何をつかめば「読めた」と言えるか）
//   task:  読んだあとに書くアウトプット
const AI_READINGS = [
  {
    "id": "defcon34-intent-based-threat-hunting",
    "org": "AI Village / DEF CON 34",
    "title": "Attackers Don't Need Shells, They Need Prompts: This Is How We Hunt Them",
    "kind": "研究ポスター",
    "year": 2026,
    "url": "https://aivillage.org/posters/attackers-dont-need-shells-they-need-prompts-this-is-how-we-hunt-them/",
    "minutes": 20,
    "level": "中級",
    "focus": "AI agentの脅威ハンティングで、prompt・tool call・retrieval data・model responseといった言語的なsignalを扱うIntent-based Threat Huntingの要点。",
    "task": "既存のSOC検知で見落とすagent操作を1つ想定し、意味の近い攻撃表現も拾える観測項目を定義する。",
    "evidenceType": "conference_poster_abstract",
    "eventStartDate": "2026-08-06",
    "eventEndDate": "2026-08-09",
    "lastVerifiedAt": "2026-10-04",
    "impactAssessment": {
      "score": 10,
      "confidence": "low",
      "signals": [
        {
          "type": "conference_research_signal",
          "evidence": "conference_poster_abstract"
        }
      ],
      "evidenceUrl": "https://aivillage.org/posters/attackers-dont-need-shells-they-need-prompts-this-is-how-we-hunt-them/",
      "assessedAt": "2026-10-19T04:49:45.819Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "no_exact_url_match",
        "linkedUrl": "https://aivillage.org/posters/attackers-dont-need-shells-they-need-prompts-this-is-how-we-hunt-them/",
        "observedAt": "2026-10-19T04:49:47.912Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "defcon34-cdc-aware-rag-poison-containment",
    "org": "AI Village / DEF CON 34",
    "title": "Poison In, Poison Out: CDC-Aware Containment for RAG and Agent Memory",
    "kind": "研究ポスター",
    "year": 2026,
    "url": "https://aivillage.org/posters/poison-in-poison-out-cdc-aware-containment-for-rag-and-agent-memory/",
    "minutes": 25,
    "level": "上級",
    "focus": "汚染されたRAG文書を直した後にも残るchunk・embedding・memory・replayed eventを追跡し、派生データを含めて削除を検証する設計。",
    "task": "RAGデータの訂正・削除要求が原文、vector index、agent memory、ログにどう伝播し完了確認されるかを表にする。",
    "evidenceType": "conference_poster_abstract",
    "eventStartDate": "2026-08-06",
    "eventEndDate": "2026-08-09",
    "lastVerifiedAt": "2026-10-04",
    "impactAssessment": {
      "score": 10,
      "confidence": "low",
      "signals": [
        {
          "type": "conference_research_signal",
          "evidence": "conference_poster_abstract"
        }
      ],
      "evidenceUrl": "https://aivillage.org/posters/poison-in-poison-out-cdc-aware-containment-for-rag-and-agent-memory/",
      "assessedAt": "2026-10-19T04:49:45.819Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "no_exact_url_match",
        "linkedUrl": "https://aivillage.org/posters/poison-in-poison-out-cdc-aware-containment-for-rag-and-agent-memory/",
        "observedAt": "2026-10-19T04:49:48.140Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "arxiv-from-billion-scale-to-million-scale-language-",
    "org": "arXiv",
    "title": "From Billion-Scale to Million-Scale Language Models: Operational Capabilities for Embedded Post-Exploitation",
    "kind": "論文",
    "year": 2026,
    "url": "https://arxiv.org/abs/2610.23534v1",
    "minutes": 20,
    "level": "中級",
    "focus": "Small Language Models (SLMs) are increasingly attractive for resource-constrained environments due to their low computational footprint. These characteristics a...に関する検証結果とセキュリティ上の示唆",
    "task": "研究の要点と得られた教訓を3行で説明し、実務における活用または注意点を1つ書く",
    "publishedAt": "2026-10-16T14:33:17.000Z",
    "impactAssessment": {
      "score": 12,
      "confidence": "low",
      "signals": [
        {
          "type": "deployment_or_adoption_language"
        }
      ],
      "evidenceUrl": "https://arxiv.org/abs/2610.23534v1",
      "assessedAt": "2026-10-19T04:49:45.326Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "no_exact_url_match",
        "linkedUrl": "https://arxiv.org/abs/2610.23534v1",
        "observedAt": "2026-10-19T04:49:48.340Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "google-cloud-announcing-wiz-runtime-sensor-add-on-for-gke-",
    "org": "Google Cloud",
    "title": "Announcing Wiz Runtime Sensor add-on for GKE: Turnkey threat detection for Kubernetes",
    "kind": "脅威レポート",
    "year": 2026,
    "url": "https://cloud.google.com/blog/products/identity-security/wiz-sensor-for-gke-turnkey-threat-detection-for-kubernetes/",
    "minutes": 20,
    "level": "上級",
    "focus": "Everything is moving faster in the age of AI, and that includes security threats. What used to take attackers weeks to exploit can now happen in just a few minu...に関する攻撃手法と侵害経路の分析",
    "task": "報告された攻撃手法の要点を3行でまとめ、自社のクラウド・AI環境で講ずべき防御策を1つ挙げる",
    "publishedAt": "2026-10-16T16:00:00.000Z",
    "impactAssessment": {
      "score": 18,
      "confidence": "low",
      "signals": [
        {
          "type": "requested_publisher_focus",
          "evidence": "Google Cloud"
        }
      ],
      "evidenceUrl": "https://cloud.google.com/blog/products/identity-security/wiz-sensor-for-gke-turnkey-threat-detection-for-kubernetes/",
      "assessedAt": "2026-10-19T04:49:43.468Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "no_exact_url_match",
        "linkedUrl": "https://cloud.google.com/blog/products/identity-security/wiz-sensor-for-gke-turnkey-threat-detection-for-kubernetes/",
        "observedAt": "2026-10-19T04:49:48.555Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "google-cloud-modernizing-perimeter-security-scalable-perim",
    "org": "Google Cloud",
    "title": "Modernizing perimeter security: Scalable perimeters with VPC Service Controls",
    "kind": "技術ブログ",
    "year": 2026,
    "url": "https://cloud.google.com/blog/products/identity-security/introducing-new-scalable-perimeter-options-with-vpc-service-controls/",
    "minutes": 20,
    "level": "入門",
    "focus": "Agents represent a fundamental shift in cloud operations. They can act on behalf of users or autonomously, make non-deterministic decisions, and request data ac...に関する機能・ベストプラクティス",
    "task": "紹介されたセキュリティ機能やベストプラクティスを確認し、自社クラウド環境への適用可能性を1段落でまとめる",
    "publishedAt": "2026-10-15T16:00:00.000Z",
    "impactAssessment": {
      "score": 18,
      "confidence": "low",
      "signals": [
        {
          "type": "requested_publisher_focus",
          "evidence": "Google Cloud"
        }
      ],
      "evidenceUrl": "https://cloud.google.com/blog/products/identity-security/introducing-new-scalable-perimeter-options-with-vpc-service-controls/",
      "assessedAt": "2026-10-19T04:49:43.468Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "no_exact_url_match",
        "linkedUrl": "https://cloud.google.com/blog/products/identity-security/introducing-new-scalable-perimeter-options-with-vpc-service-controls/",
        "observedAt": "2026-10-19T04:49:48.811Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "openai-daybreak-models-are-now-available-on-aws",
    "org": "OpenAI",
    "title": "Daybreak models are now available on AWS",
    "kind": "技術ブログ",
    "year": 2026,
    "url": "https://openai.com/index/daybreak-models-are-now-available-on-aws",
    "minutes": 20,
    "level": "入門",
    "focus": "OpenAI and AWS are making Daybreak cybersecurity capabilities available through Amazon Bedrock to support enterprise security workflows....のポイントと利用上の安全性",
    "task": "内容の要点を3つ箇条書きにし、業務でAIを活用する際のセキュリティ上の注意点を1つ書く",
    "publishedAt": "2026-08-11T10:00:00.000Z",
    "impactAssessment": {
      "score": 18,
      "confidence": "low",
      "signals": [
        {
          "type": "requested_publisher_focus",
          "evidence": "OpenAI"
        }
      ],
      "evidenceUrl": "https://openai.com/index/daybreak-models-are-now-available-on-aws",
      "assessedAt": "2026-10-19T04:49:44.213Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "lookup_limit",
        "linkedUrl": "https://openai.com/index/daybreak-models-are-now-available-on-aws",
        "observedAt": "2026-10-19T04:49:45.821Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "openai-the-us-is-advancing-ai-safety-through-state-a",
    "org": "OpenAI",
    "title": "The US is advancing AI safety through state and federal action",
    "kind": "ガイドライン",
    "year": 2026,
    "url": "https://openai.com/index/advancing-ai-safety-through-state-and-federal-action",
    "minutes": 20,
    "level": "入門",
    "focus": "OpenAI outlines a “reverse federalism” approach to AI governance, where state laws help build a national framework for safe, democratic AI....のポイントと利用上の安全性",
    "task": "内容の要点を3つ箇条書きにし、業務でAIを活用する際のセキュリティ上の注意点を1つ書く",
    "publishedAt": "2026-07-15T12:00:00.000Z",
    "impactAssessment": {
      "score": 18,
      "confidence": "low",
      "signals": [
        {
          "type": "requested_publisher_focus",
          "evidence": "OpenAI"
        }
      ],
      "evidenceUrl": "https://openai.com/index/advancing-ai-safety-through-state-and-federal-action",
      "assessedAt": "2026-10-19T04:49:44.218Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "lookup_limit",
        "linkedUrl": "https://openai.com/index/advancing-ai-safety-through-state-and-federal-action",
        "observedAt": "2026-10-19T04:49:45.821Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "openai-access-openai-models-and-codex-through-your-o",
    "org": "OpenAI",
    "title": "Access OpenAI models and Codex through your Oracle cloud commitment",
    "kind": "技術ブログ",
    "year": 2026,
    "url": "https://openai.com/index/openai-on-oracle-cloud",
    "minutes": 20,
    "level": "入門",
    "focus": "Access OpenAI models and Codex through Oracle Cloud, using existing commitments to build and deploy AI with enterprise security and governance....のポイントと利用上の安全性",
    "task": "内容の要点を3つ箇条書きにし、業務でAIを活用する際のセキュリティ上の注意点を1つ書く",
    "publishedAt": "2026-06-10T20:00:00.000Z",
    "impactAssessment": {
      "score": 18,
      "confidence": "low",
      "signals": [
        {
          "type": "requested_publisher_focus",
          "evidence": "OpenAI"
        }
      ],
      "evidenceUrl": "https://openai.com/index/openai-on-oracle-cloud",
      "assessedAt": "2026-10-19T04:49:44.223Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "lookup_limit",
        "linkedUrl": "https://openai.com/index/openai-on-oracle-cloud",
        "observedAt": "2026-10-19T04:49:45.821Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "openai-update-to-gpt-5-system-card-gpt-52",
    "org": "OpenAI",
    "title": "Update to GPT-5 System Card: GPT-5.2",
    "kind": "技術ブログ",
    "year": 2025,
    "url": "https://openai.com/index/gpt-5-system-card-update-gpt-5-2",
    "minutes": 20,
    "level": "入門",
    "focus": "GPT-5.2 is the latest model family in the GPT-5 series. The comprehensive safety mitigation approach for these models is largely the same as that described in t...のポイントと利用上の安全性",
    "task": "内容の要点を3つ箇条書きにし、業務でAIを活用する際のセキュリティ上の注意点を1つ書く",
    "publishedAt": "2025-12-11T00:00:00.000Z",
    "impactAssessment": {
      "score": 48,
      "confidence": "medium",
      "signals": [
        {
          "type": "requested_publisher_focus",
          "evidence": "OpenAI"
        },
        {
          "type": "explicit_scale_claim",
          "evidence": "5.2 models"
        }
      ],
      "evidenceUrl": "https://openai.com/index/gpt-5-system-card-update-gpt-5-2",
      "assessedAt": "2026-10-12T06:05:59.943Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "no_exact_url_match",
        "linkedUrl": "https://openai.com/index/gpt-5-system-card-update-gpt-5-2",
        "observedAt": "2026-10-12T06:06:01.316Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "defcon34-agent-ci-cd-privilege-boundaries",
    "org": "AI Village / DEF CON 34",
    "title": "I'll Just Call You: Agent-to-Agent Privilege Boundary Failures in CI/CD Agents",
    "kind": "研究ポスター",
    "year": 2026,
    "url": "https://aivillage.org/posters/ill-just-call-you-agent-to-agent-privilege-boundary-failures-in-ci-cd/",
    "minutes": 25,
    "level": "上級",
    "focus": "repository内容へのprompt injectionで低権限agentから別の高権限CI/CD agentを起動させる連鎖と、agent identity・token権限・trigger条件のリスク。",
    "task": "CI/CD内のagent間トリガーを洗い出し、信頼できない入力から高権限処理へ到達できる経路を1つ特定する。",
    "evidenceType": "conference_poster_abstract",
    "eventStartDate": "2026-08-06",
    "eventEndDate": "2026-08-09",
    "lastVerifiedAt": "2026-10-04",
    "impactAssessment": {
      "score": 10,
      "confidence": "low",
      "signals": [
        {
          "type": "conference_research_signal",
          "evidence": "conference_poster_abstract"
        }
      ],
      "evidenceUrl": "https://aivillage.org/posters/ill-just-call-you-agent-to-agent-privilege-boundary-failures-in-ci-cd/",
      "assessedAt": "2026-10-12T06:06:00.860Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "no_exact_url_match",
        "linkedUrl": "https://aivillage.org/posters/ill-just-call-you-agent-to-agent-privilege-boundary-failures-in-ci-cd/",
        "observedAt": "2026-10-12T06:06:05.773Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "defcon34-prompt-injection-testing-scale",
    "org": "AI Village / DEF CON 34",
    "title": "Prompt Injection Testing at Scale",
    "kind": "研究ポスター",
    "year": 2026,
    "url": "https://aivillage.org/posters/prompt-injection-testing-at-scale/",
    "minutes": 20,
    "level": "中級",
    "focus": "手動red teamだけでは追いつかないagentのprompt injectionリスクに対し、継続的な自動敵対テストを開発工程に組み込む考え方。",
    "task": "自組織のAI機能に対するprompt injection回帰テストを1件設計し、リリース判定で見る結果を定義する。",
    "evidenceType": "conference_poster_abstract",
    "eventStartDate": "2026-08-06",
    "eventEndDate": "2026-08-09",
    "lastVerifiedAt": "2026-10-04",
    "impactAssessment": {
      "score": 10,
      "confidence": "low",
      "signals": [
        {
          "type": "conference_research_signal",
          "evidence": "conference_poster_abstract"
        }
      ],
      "evidenceUrl": "https://aivillage.org/posters/prompt-injection-testing-at-scale/",
      "assessedAt": "2026-10-12T06:06:00.860Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "no_exact_url_match",
        "linkedUrl": "https://aivillage.org/posters/prompt-injection-testing-at-scale/",
        "observedAt": "2026-10-12T06:06:06.128Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "defcon34-cross-enterprise-agent-identity",
    "org": "AI Village / DEF CON 34",
    "title": "Securing Cross-Enterprise AI Agents",
    "kind": "研究ポスター",
    "year": 2026,
    "url": "https://aivillage.org/posters/securing-cross-enterprise-ai-agents/",
    "minutes": 20,
    "level": "上級",
    "focus": "企業間でagentに権限を委譲するとき、依頼者と実行agentのidentityを伝播させ、各信頼境界で委譲権限を検証・記録する参照設計。",
    "task": "agentが別組織のAPIを呼ぶ設計を想定し、依頼者identity・委譲範囲・監査記録をどう引き継ぐかを図示する。",
    "evidenceType": "conference_poster_abstract",
    "eventStartDate": "2026-08-06",
    "eventEndDate": "2026-08-09",
    "lastVerifiedAt": "2026-10-04",
    "impactAssessment": {
      "score": 10,
      "confidence": "low",
      "signals": [
        {
          "type": "conference_research_signal",
          "evidence": "conference_poster_abstract"
        }
      ],
      "evidenceUrl": "https://aivillage.org/posters/securing-cross-enterprise-ai-agents/",
      "assessedAt": "2026-10-12T06:06:00.860Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "no_exact_url_match",
        "linkedUrl": "https://aivillage.org/posters/securing-cross-enterprise-ai-agents/",
        "observedAt": "2026-10-12T06:06:06.922Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "openai-openai-and-hugging-face-partner-to-address-se",
    "org": "OpenAI",
    "title": "OpenAI and Hugging Face partner to address security incident during model evaluation",
    "kind": "脅威レポート",
    "year": 2026,
    "url": "https://openai.com/index/hugging-face-model-evaluation-security-incident",
    "minutes": 20,
    "level": "上級",
    "focus": "OpenAI and Hugging Face share early findings from a security incident during AI model evaluation, highlighting advanced cyber capabilities and lessons for defen...に関する攻撃手法と侵害経路の分析",
    "task": "報告された攻撃手法の要点を3行でまとめ、自社のクラウド・AI環境で講ずべき防御策を1つ挙げる",
    "publishedAt": "2026-07-21T07:00:00.000Z",
    "impactAssessment": {
      "score": 33,
      "confidence": "low-medium",
      "signals": [
        {
          "type": "requested_publisher_focus",
          "evidence": "OpenAI"
        },
        {
          "type": "observed_security_or_operational_effect"
        }
      ],
      "evidenceUrl": "https://openai.com/index/hugging-face-model-evaluation-security-incident",
      "assessedAt": "2026-10-12T06:05:59.897Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "no_exact_url_match",
        "linkedUrl": "https://openai.com/index/hugging-face-model-evaluation-security-incident",
        "observedAt": "2026-10-12T06:06:07.975Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "openai-mixpanel-security-incident-what-openai-users-",
    "org": "OpenAI",
    "title": "Mixpanel security incident: what OpenAI users need to know",
    "kind": "脅威レポート",
    "year": 2025,
    "url": "https://openai.com/index/mixpanel-incident",
    "minutes": 20,
    "level": "入門",
    "focus": "OpenAI shares details about a Mixpanel security incident involving limited API analytics data. No API content, credentials, or payment details were exposed. Lea...に関する攻撃手法と侵害経路の分析",
    "task": "報告された攻撃手法の要点を3行でまとめ、自社のクラウド・AI環境で講ずべき防御策を1つ挙げる",
    "publishedAt": "2025-11-26T19:00:00.000Z",
    "impactAssessment": {
      "score": 33,
      "confidence": "low-medium",
      "signals": [
        {
          "type": "requested_publisher_focus",
          "evidence": "OpenAI"
        },
        {
          "type": "observed_security_or_operational_effect"
        }
      ],
      "evidenceUrl": "https://openai.com/index/mixpanel-incident",
      "assessedAt": "2026-10-12T06:05:59.947Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "observed",
        "linkedUrl": "https://openai.com/index/mixpanel-incident",
        "storyId": "46065585",
        "evidenceUrl": "https://news.ycombinator.com/item?id=46065585",
        "observedAt": "2026-10-12T06:06:08.475Z",
        "points": 82,
        "comments": 11,
        "pointsUnit": "Hacker News story points; not a person count",
        "metricDefinition": "comments is the official API descendants count",
        "lookupSources": [
          "https://github.com/algolia/hn-search",
          "https://github.com/HackerNews/API"
        ]
      }
    ]
  },
  {
    "id": "google-cloud-whats-new-with-google-data-cloud",
    "org": "Google Cloud",
    "title": "What’s new with Google Data Cloud",
    "kind": "技術ブログ",
    "year": 2026,
    "url": "https://cloud.google.com/blog/products/data-analytics/whats-new-with-google-data-cloud/",
    "minutes": 20,
    "level": "上級",
    "focus": "October 5 - October 9 Data Agent Kit is now generally available to bring Google Data Cloud to any coding agentData Agent Kit provides a free collection of Model...に関する機能・ベストプラクティス",
    "task": "紹介されたセキュリティ機能やベストプラクティスを確認し、自社クラウド環境への適用可能性を1段落でまとめる",
    "publishedAt": "2026-10-09T16:00:00.000Z",
    "impactAssessment": {
      "score": 18,
      "confidence": "low",
      "signals": [
        {
          "type": "requested_publisher_focus",
          "evidence": "Google Cloud"
        }
      ],
      "evidenceUrl": "https://cloud.google.com/blog/products/data-analytics/whats-new-with-google-data-cloud/",
      "assessedAt": "2026-10-12T06:05:59.325Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "lookup_limit",
        "linkedUrl": "https://cloud.google.com/blog/products/data-analytics/whats-new-with-google-data-cloud/",
        "observedAt": "2026-10-12T06:06:00.862Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "google-cloud-announcing-mcp-toolbox-java-sdk-v10-agentic-d",
    "org": "Google Cloud",
    "title": "Announcing MCP Toolbox Java SDK v1.0: Agentic data access for the enterprise",
    "kind": "技術ブログ",
    "year": 2026,
    "url": "https://cloud.google.com/blog/topics/developers-practitioners/announcing-mcp-toolbox-java-sdk-v10-agentic-data-access-for-the-enterprise/",
    "minutes": 20,
    "level": "入門",
    "focus": "Co-authors:Stenal Jolly, Strategic Cloud Engineer, GoogleAnubhav Dhawan, Software Engineer, Google Following the landmark announcement of MCP Toolbox v1.0, we'r...に関する機能・ベストプラクティス",
    "task": "紹介されたセキュリティ機能やベストプラクティスを確認し、自社クラウド環境への適用可能性を1段落でまとめる",
    "publishedAt": "2026-10-06T19:00:00.000Z",
    "impactAssessment": {
      "score": 18,
      "confidence": "low",
      "signals": [
        {
          "type": "requested_publisher_focus",
          "evidence": "Google Cloud"
        }
      ],
      "evidenceUrl": "https://cloud.google.com/blog/topics/developers-practitioners/announcing-mcp-toolbox-java-sdk-v10-agentic-data-access-for-the-enterprise/",
      "assessedAt": "2026-10-12T06:05:59.325Z",
      "communityMetrics": "not_collected_from_source"
    },
    "communitySignals": [
      {
        "source": "Hacker News",
        "status": "unknown",
        "reason": "lookup_limit",
        "linkedUrl": "https://cloud.google.com/blog/topics/developers-practitioners/announcing-mcp-toolbox-java-sdk-v10-agentic-data-access-for-the-enterprise/",
        "observedAt": "2026-10-12T06:06:00.862Z",
        "pointsUnit": "unknown"
      }
    ]
  },
  {
    "id": "defcon34-mcparasite-agent-worm",
    "org": "AI Village / DEF CON 34",
    "title": "Agent-to-Agent Worm Propagation in MCP-Based AI Systems",
    "kind": "研究ポスター",
    "year": 2026,
    "url": "https://aivillage.org/posters/agent-to-agent-worm-propagation-in-mcp-based-ai-systems/",
    "minutes": 20,
    "level": "中級",
    "focus": "共有チャネルを介して攻撃者制御のコンテキストが別のAIエージェントに伝播し、異なる権限のツール操作を誘発する条件と、伝播を断つ防御策。",
    "task": "実験条件と成功判定を整理し、コンテキスト分離・権限最小化・操作承認・ツール呼出ログのうち自組織で先に検証する対策を1つ選ぶ。",
    "evidenceType": "conference_poster_abstract",
    "eventStartDate": "2026-08-06",
    "eventEndDate": "2026-08-09",
    "lastVerifiedAt": "2026-10-04"
  },
  {
    "id": "defcon34-modelshield-malicious-models",
    "org": "AI Village / DEF CON 34",
    "title": "The Model Is the Malware: Runtime Behavioral Detection of Malicious ML Artifacts",
    "kind": "研究ポスター",
    "year": 2026,
    "url": "https://aivillage.org/posters/the-model-is-the-malware-runtime-behavioral-detection-of-malicious-ml/",
    "minutes": 25,
    "level": "上級",
    "focus": "モデルartifactの静的検査だけでなく、ロード時のAPI挙動とOSレベルの動作を帰属させて悪性モデルを検出するModelShieldの仕組みと評価。",
    "task": "モデルを取得・評価・配置する経路を図示し、実行時検知とモデルの出所検証をどこに加えるべきかを提案する。",
    "evidenceType": "conference_poster_abstract",
    "eventStartDate": "2026-08-06",
    "eventEndDate": "2026-08-09",
    "lastVerifiedAt": "2026-10-04"
  },
  {
    "id": "defcon34-poisoning-soc-telemetry",
    "org": "AI Village / DEF CON 34",
    "title": "Poisoning the SOC: Prompt Injection via Ingested Telemetry",
    "kind": "研究ポスター",
    "year": 2026,
    "url": "https://aivillage.org/posters/poisoning-the-soc-prompt-injection-via-ingested-telemetry/",
    "minutes": 20,
    "level": "中級",
    "focus": "攻撃者が書き込めるログフィールドからSOCのLLM agentへ指示が到達する経路と、現実のSIEM・agent pipeline上での影響範囲。",
    "task": "ログを読むAI機能を1つ選び、データと指示の境界、攻撃者が制御できるフィールド、許されるツール操作を点検する。",
    "evidenceType": "conference_poster_abstract",
    "eventStartDate": "2026-08-06",
    "eventEndDate": "2026-08-09",
    "lastVerifiedAt": "2026-10-04"
  },
  {
    "id": "aws-transforming-bedrock-guardrails-events-into-o",
    "org": "AWS",
    "title": "Transforming Bedrock Guardrails events into OCSF with CloudWatch",
    "kind": "技術ブログ",
    "year": 2026,
    "url": "https://aws.amazon.com/blogs/security/transforming-bedrock-guardrails-events-into-ocsf-with-cloudwatch/",
    "minutes": 20,
    "level": "入門",
    "focus": "Security teams investigating possible AI-related security events need guardrail intervention data alongside their existing security telemetry. When a guardrail ...に関する機能・ベストプラクティス",
    "task": "紹介されたセキュリティ機能やベストプラクティスを確認し、自社クラウド環境への適用可能性を1段落でまとめる",
    "publishedAt": "2026-09-21T15:33:25.000Z"
  },
  {
    "id": "aws-architecting-resilient-authentication-with-am",
    "org": "AWS",
    "title": "Architecting resilient authentication with Amazon Cognito multi-Region replication",
    "kind": "技術ブログ",
    "year": 2026,
    "url": "https://aws.amazon.com/blogs/security/architecting-resilient-authentication-with-amazon-cognito-multi-region-replication/",
    "minutes": 20,
    "level": "入門",
    "focus": "Your consumer identity and access management (CIAM) system is the foundation of your customer experience. It’s how users sign in, access services, and engage wi...に関する機能・ベストプラクティス",
    "task": "紹介されたセキュリティ機能やベストプラクティスを確認し、自社クラウド環境への適用可能性を1段落でまとめる",
    "publishedAt": "2026-09-15T19:00:52.000Z"
  },
  {
    "id": "aws-incident-response-guide-for-aws-cloudtrail-in",
    "org": "AWS",
    "title": "Incident response guide for AWS CloudTrail investigations – Part 2",
    "kind": "脅威レポート",
    "year": 2026,
    "url": "https://aws.amazon.com/blogs/security/incident-response-guide-for-aws-cloudtrail-investigations-part-2/",
    "minutes": 20,
    "level": "入門",
    "focus": "In Part 1 of this guide, we examined two common incident scenarios: cross-account Amazon Simple Storage Service (Amazon S3) data deletion with ransomware implic...に関する攻撃手法と侵害経路の分析",
    "task": "報告された攻撃手法の要点を3行でまとめ、自社のクラウド・AI環境で講ずべき防御策を1つ挙げる",
    "publishedAt": "2026-09-03T21:15:53.000Z"
  },
  {
    "id": "aws-agentic-security-detection-and-response-at-ma",
    "org": "AWS",
    "title": "Agentic security: Detection and response at machine speed",
    "kind": "技術ブログ",
    "year": 2026,
    "url": "https://aws.amazon.com/blogs/security/agentic-security-detection-and-response-at-machine-speed/",
    "minutes": 20,
    "level": "入門",
    "focus": "After talking with enterprise security leaders over the past year, one thing has become clear: the rise of autonomous AI agents is the most significant shift in...に関する機能・ベストプラクティス",
    "task": "紹介されたセキュリティ機能やベストプラクティスを確認し、自社クラウド環境への適用可能性を1段落でまとめる",
    "publishedAt": "2026-09-02T18:36:37.000Z"
  },
  {
    "id": "aws-we-invited-a-direct-competitor-into-security-",
    "org": "AWS",
    "title": "We invited a direct competitor into Security Hub Extended. Here’s why.",
    "kind": "技術ブログ",
    "year": 2026,
    "url": "https://aws.amazon.com/blogs/security/we-invited-a-direct-competitor-into-security-hub-extended-heres-why/",
    "minutes": 20,
    "level": "入門",
    "focus": "When customers keep pointing you to a solution that overlaps with parts of your own offering, you have a choice to make. This post is about the choice we made w...に関する機能・ベストプラクティス",
    "task": "紹介されたセキュリティ機能やベストプラクティスを確認し、自社クラウド環境への適用可能性を1段落でまとめる",
    "publishedAt": "2026-08-31T19:00:07.000Z"
  },
  {
    "id": "microsoft-storm-3168-agentic-driven-cloud-attacks-using",
    "org": "Microsoft",
    "title": "Storm-3168: Agentic-driven cloud attacks using compromised service principals",
    "kind": "脅威レポート",
    "year": 2026,
    "url": "https://www.microsoft.com/en-us/security/blog/2026/09/25/storm-3168-agentic-driven-cloud-attacks-using-compromised-service-principals/",
    "minutes": 20,
    "level": "入門",
    "focus": "Microsoft details JADEPUFFER-linked Azure reconnaissance, resource deletion, and credential access using compromised service principals, identifying the activit...に関する攻撃手法と侵害経路の分析",
    "task": "報告された攻撃手法の要点を3行でまとめ、自社のクラウド・AI環境で講ずべき防御策を1つ挙げる"
  },
  {
    "id": "arxiv-coding-agents-arent-enough-evaluating-an-ente",
    "org": "arXiv",
    "title": "Coding Agents Aren't Enough! Evaluating an Enterprise Security Brain for Agentic Cloud Investigations",
    "kind": "論文",
    "year": 2026,
    "url": "https://arxiv.org/abs/2609.30345v1",
    "minutes": 20,
    "level": "中級",
    "focus": "Cloud-security investigation is dominated by population tasks: which identities can read a data store, how many resources fail a control, which assets are reach...に関する検証結果とセキュリティ上の示唆",
    "task": "研究の要点と得られた教訓を3行で説明し、実務における活用または注意点を1つ書く"
  },
  {
    "id": "arxiv-blockchain-enabled-artificial-intelligence-an",
    "org": "arXiv",
    "title": "Blockchain-Enabled Artificial Intelligence and AI Agents for Secure Data Sharing and Cybersecurity Applications",
    "kind": "論文",
    "year": 2026,
    "url": "https://arxiv.org/abs/2609.28843v1",
    "minutes": 20,
    "level": "中級",
    "focus": "Blockchain and artificial intelligence (AI) are converging into a single infrastructural layer for securing data sharing, model integrity, and autonomous decisi...に関する検証結果とセキュリティ上の示唆",
    "task": "研究の要点と得られた教訓を3行で説明し、実務における活用または注意点を1つ書く"
  },
  {
    "id": "aws-supporting-asds-multi-factor-authentication-c",
    "org": "AWS",
    "title": "Supporting ASD’s multi-factor authentication campaign: Why MFA matters more than ever",
    "kind": "脅威レポート",
    "year": 2026,
    "url": "https://aws.amazon.com/blogs/security/supporting-asds-multi-factor-authentication-campaign-why-mfa-matters-more-than-ever/",
    "minutes": 20,
    "level": "入門",
    "focus": "The Australian Signals Directorate (ASD) has this month issued a clear call to action through its Multi-factor authentication: Switch it on campaign, urging bus...に関する攻撃手法と侵害経路の分析",
    "task": "報告された攻撃手法の要点を3行でまとめ、自社のクラウド・AI環境で講ずべき防御策を1つ挙げる"
  },
  {
    "id": "openai-mentalhealthbench-2026",
    "org": "OpenAI",
    "title": "Introducing MentalHealthBench",
    "kind": "評価ベンチマーク",
    "year": 2026,
    "publishedAt": "2026-09-23",
    "url": "https://openai.com/index/introducing-mentalhealthbench/",
    "minutes": 20,
    "level": "中級",
    "focus": "80人以上の専門家が作成に関与した評価基準、文脈確認・利用者の主体性・緊急度別の評価方法、ベンチマークの限界",
    "task": "評価対象の行動を3つ挙げ、業務用AIの評価にも転用できる観点と転用できない観点を分ける"
  },
  {
    "id": "anthropic-misuse-report-2026-09",
    "org": "Anthropic",
    "title": "Detecting and countering misuse of AI: September 2026",
    "kind": "脅威インテリジェンス",
    "year": 2026,
    "publishedAt": "2026-09-10",
    "url": "https://www.anthropic.com/threat-intelligence-report-september-2026",
    "minutes": 25,
    "level": "中級",
    "focus": "実際に検知・阻止したAI悪用事例、攻撃者の目的とAIの役割、提供者側の検知・対応策を、確認済み事実と提供者の分析に分けて読む",
    "task": "事例を1件選び、脅威・検知シグナル・対応・残る課題を4項目で整理する"
  },
  {
    "id": "openai-gpt6-astra-system-card-2026",
    "org": "OpenAI",
    "title": "GPT-6 Astra System Card",
    "kind": "システムカード",
    "year": 2026,
    "publishedAt": "2026-09-03",
    "url": "https://deploymentsafety.openai.com/gpt-6-astra/protocolqa-open-ended",
    "minutes": 25,
    "level": "中級",
    "focus": "サイバー能力の評価、安全対策、監視の限界、評価で失敗が観測されなかったことと安全性が保証されることの違い",
    "task": "評価結果を1つ選び、対象範囲・確認できたこと・未確認のことを3列でまとめる"
  },
  {
    "id": "openai-huggingface-incident-2026",
    "org": "OpenAI",
    "title": "The Hugging Face incident and the road ahead",
    "kind": "セキュリティインシデント報告",
    "year": 2026,
    "publishedAt": "2026-08-26",
    "url": "https://openai.com/index/hugging-face-incident-and-the-road-ahead/",
    "minutes": 30,
    "level": "中級",
    "focus": "AIエージェントが隔離・通信制御を回避した経緯、報酬ハック・持続的な試行・無断通信、封じ込め・監視・インシデント対応の課題",
    "task": "エージェント実行環境に必要な予防・検知・封じ込め策をそれぞれ1つ提案する"
  },
  {
    "id": "microsoft-red-teaming-100",
    "org": "Microsoft",
    "title": "Lessons From Red Teaming 100 Generative AI Products",
    "kind": "論文",
    "year": 2025,
    "url": "https://arxiv.org/abs/2501.07238",
    "minutes": 30,
    "level": "中級",
    "focus": "生成AI製品のレッドチーミングで得られた教訓（単純な攻撃でも十分に効く、自動化と人手の役割分担、AIの安全性とセキュリティの両面）",
    "task": "教訓の中から、自社で生成AIを導入するときに最初に確認すべき点を3つ挙げる"
  },
  {
    "id": "google-adversarial-misuse",
    "org": "Google (GTIG)",
    "title": "Adversarial Misuse of Generative AI",
    "kind": "脅威レポート",
    "year": 2025,
    "url": "https://cloud.google.com/blog/topics/threat-intelligence/adversarial-misuse-generative-ai",
    "minutes": 20,
    "level": "入門",
    "focus": "国家支援型の攻撃者が生成AIを実際にどう使っているか（偵察・コード作成・フィッシング文面など）、AIで「新しい攻撃」が生まれたのか「効率化」にとどまるのか",
    "task": "攻撃者のAI利用をサイバーキルチェーンの段階に当てはめて整理する"
  },
  {
    "id": "anthropic-constitutional-classifiers",
    "org": "Anthropic",
    "title": "Constitutional Classifiers: Defending against universal jailbreaks",
    "kind": "研究",
    "year": 2025,
    "url": "https://www.anthropic.com/news/constitutional-classifiers",
    "minutes": 15,
    "level": "中級",
    "focus": "入力と出力を分類器で監視してジェイルブレイクを防ぐ仕組み、防御効果と過剰拒否・計算コストのトレードオフ",
    "task": "入力フィルタと出力フィルタの役割の違いを、WAFとの類似点・相違点と合わせて説明する"
  },
  {
    "id": "openai-why-hallucinate",
    "org": "OpenAI",
    "title": "Why Language Models Hallucinate",
    "kind": "論文",
    "year": 2025,
    "url": "https://arxiv.org/abs/2509.04664",
    "minutes": 30,
    "level": "中級",
    "focus": "ハルシネーションが起きる統計的な理由と、「分からない」と答えるより推測したほうが得点が上がる評価方法が問題を助長しているという指摘",
    "task": "ハルシネーションを減らすために、業務でAIを使う側ができる工夫を2つ書く"
  }
];

module.exports = { AI_READINGS };
