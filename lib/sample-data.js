// 初回利用時のサンプルデータ（すべて架空で、タイトルに【サンプル】と明記）
const INITIAL_DATA = {
  items: [
    {
      id: 'sample_sc_01',
      type: 'sc_past_paper',
      category: 'sc',
      title: '【サンプル】令和5年秋期 支援士 科目B 問1 (Webセキュリティ)',
      source: 'IPA 過去問題 (架空演習用サンプル)',
      url: '',
      publishedDate: '2023-10-08',
      questionText: '設問1: 被害を受けたECサイトのセッション管理において、Cookie窃取を防ぐために設定すべきCookie属性とその理由を40字以内で述べよ。',
      userAnswer: 'HttpOnly属性を設定し、JavaScriptからのCookie読み取りを制限する。',
      notes: 'XSSによるセッションハイジャック対策。Secure属性との使い分けに注意。',
      practicalValue: 'high',
      needsReview: true,
      nextAction: '既存知識と比較する',
      isSample: true,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 'sample_sc_02',
      type: 'sc_past_paper',
      category: 'sc',
      title: '【サンプル】令和4年秋期 支援士 科目B 問2 (認証・認可)',
      source: 'IPA 過去問題 (架空演習用サンプル)',
      url: '',
      publishedDate: '2022-10-09',
      questionText: '設問2: OAuth 2.0 PKCEにおいて、認可コード横取り攻撃を防ぐためにクライアントが送信するパラメータを2つ挙げよ。',
      userAnswer: 'code_challenge と code_verifier。',
      notes: '認可リクエスト時にcode_challenge、トークンリクエスト時にcode_verifierを送る。',
      practicalValue: 'high',
      needsReview: false,
      nextAction: '設定を確認する',
      isSample: true,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'sample_ai_01',
      type: 'catchup',
      category: 'ai',
      title: '【サンプル】LLMアプリケーション向けガードレール設計ガイド',
      source: '技術ブログ記事 (架空サンプル)',
      url: 'https://example.com/ai/guardrails-guide',
      publishedDate: '2026-09-15',
      questionText: '',
      userAnswer: '',
      notes: '入力フィルタリングと出力検証の多層防御。プロンプトインジェクション検知ルールを整理。',
      practicalValue: 'high',
      needsReview: true,
      nextAction: '試す',
      isSample: true,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'sample_cloud_01',
      type: 'catchup',
      category: 'cloud',
      title: '【サンプル】クラウドIAM最小権限運用の自動化ポリシー改定',
      source: 'クラウド公式アップデート (架空サンプル)',
      url: 'https://example.com/cloud/iam-least-privilege',
      publishedDate: '2026-09-18',
      questionText: '',
      userAnswer: '',
      notes: '未使用権限の90日経過自動無効化とアラート通知のベストプラクティス。',
      practicalValue: 'medium',
      needsReview: false,
      nextAction: '設定を確認する',
      isSample: true,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: 'sample_sec_01',
      type: 'catchup',
      category: 'security',
      title: '【サンプル】Active Directory環境におけるKerberoasting攻撃事例と検知',
      source: 'CERT セキュリティ速報 (架空サンプル)',
      url: 'https://example.com/sec/kerberoasting-alert',
      publishedDate: '2026-09-20',
      questionText: '',
      userAnswer: '',
      notes: 'SPNが設定されたサービスアカウントの暗号化方式をAES-256に制限し、イベントID 4769を監視。',
      practicalValue: 'high',
      needsReview: true,
      nextAction: 'チーム向けに説明する',
      isSample: true,
      createdAt: new Date().toISOString()
    }
  ],
  history: [
    {
      id: 'sample_hist_01',
      itemId: 'sample_sc_01',
      category: 'sc',
      questType: '過去問を解く',
      title: '【サンプル】令和5年秋期 支援士 科目B 問1 初回演習',
      minutes: 25,
      reason: '科目Bの記述答案作成の訓練のため',
      criteria: 'Cookie属性名と理由を文字数内で正確に記述する',
      decisionSource: 'rule',
      userAnswer: 'HttpOnly属性を設定し、JavaScriptからのアクセスを遮断する。',
      isCorrect: false,
      mistakeReason: '設問要求とのずれ', // 読み落とし / 知識不足 / 設問要求とのずれ / 時間不足 / その他
      mistakeDetail: '「理由」部分でXSSへの言及が不足していた',
      reviewIntervalDays: 3,
      nextReviewDate: new Date(Date.now() - 3600000).toISOString(), // 復習期限到来
      understandingScore: 2,
      noulNeedsReview: true,
      isSample: true,
      completedAt: new Date(Date.now() - 3 * 86400000).toISOString()
    }
  ]
};

module.exports = { INITIAL_DATA };
