// AWS 学習コース（基礎 / SAA / SAP）の一問一答。問題は日本語のオリジナルで、試験問題・市販問題集の転載ではない。
// 「公式問題」ではなく、AWS 公式資料（公式ドキュメント・公式サイト）を根拠に作った学習用の問題。本番試験の形式・合格を保証するものではない。
// 試験名・試験コード・出題領域は、AWS 公式の試験ガイドで確認した内容（CHECKED_AT 時点）。
const clf = require('./clf-c02');
const saa = require('./saa-c03');
const sap = require('./sap-c02');

const CHECKED_AT = '2026-10-22';
const GUIDE = 'https://docs.aws.amazon.com/aws-certification/latest';

const AWS_COURSES = [
  {
    id: 'clf', exam: 'aws-clf', level: '基礎',
    name: 'AWS Certified Cloud Practitioner', shortName: 'Cloud Practitioner', examCode: 'CLF-C02',
    guideUrl: `${GUIDE}/cloud-practitioner-02/cloud-practitioner-02.html`,
    domains: [
      { id: 'd1', name: 'クラウドの概念', weight: 24 },
      { id: 'd2', name: 'セキュリティとコンプライアンス', weight: 30 },
      { id: 'd3', name: 'クラウドテクノロジーとサービス', weight: 34 },
      { id: 'd4', name: '請求、料金、サポート', weight: 12 }
    ],
    rows: clf
  },
  {
    id: 'saa', exam: 'aws-saa', level: '設計・中級',
    name: 'AWS Certified Solutions Architect - Associate', shortName: 'SAA', examCode: 'SAA-C03',
    guideUrl: `${GUIDE}/solutions-architect-associate-03/solutions-architect-associate-03.html`,
    domains: [
      { id: 'd1', name: 'セキュアなアーキテクチャの設計', weight: 30 },
      { id: 'd2', name: '回復性の高いアーキテクチャの設計', weight: 26 },
      { id: 'd3', name: '高パフォーマンスなアーキテクチャの設計', weight: 24 },
      { id: 'd4', name: 'コストを最適化したアーキテクチャの設計', weight: 20 }
    ],
    rows: saa
  },
  {
    id: 'sap', exam: 'aws-sap', level: '設計・上級',
    name: 'AWS Certified Solutions Architect - Professional', shortName: 'SAP', examCode: 'SAP-C02',
    guideUrl: `${GUIDE}/solutions-architect-professional-02/solutions-architect-professional-02.html`,
    // AWS公式ページの記載（確認日時点）: 現行は SAP-C02。次期試験 SAP-C03 が予告されている。ここでは現行 SAP-C02 のガイドに基づく。
    notice: '現行の試験コードは SAP-C02 です。AWS公式ページでは次期試験 SAP-C03 が予告されています（2026-10-22 確認）。この問題集は現行 SAP-C02 の試験ガイドの領域に沿った、サービスの使い分けと基本設計の想起が中心です。複数サービスの組み合わせやトレードオフを深く問う本番形式の演習ではありません。',
    domains: [
      { id: 'd1', name: '組織の複雑さへの対応設計', weight: 26 },
      { id: 'd2', name: '新規ソリューションの設計', weight: 29 },
      { id: 'd3', name: '既存ソリューションの継続的改善', weight: 25 },
      { id: 'd4', name: 'ワークロードの移行とモダナイゼーションの加速', weight: 20 }
    ],
    rows: sap
  }
];

function buildCards(course) {
  const domainById = new Map(course.domains.map(d => [d.id, d]));
  return course.rows.map(([id, domainId, kind, topic, question, answer, explanation, source], i) => {
    // 根拠は1つ以上のURL（先頭が主な根拠）。回答と解説の主張は、挙げた根拠の記述に沿うこと
    const sources = Array.isArray(source) ? source : [source];
    const url = sources[0];
    const domain = domainById.get(domainId);
    if (!domain) throw new Error(`AWS問題 ${id}: 未定義の領域 ${domainId}`);
    return {
      id,
      family: 'aws',
      exam: course.exam,
      course: course.id,
      examCode: course.examCode,
      session: null,
      sessionLabel: '',
      no: i + 1,
      topic,
      question,
      answer,
      explanation,
      kind,
      field: domain.name,
      domain: domainId,
      group: `${course.exam}-${domainId}`,
      sourceLabel: `AWS ${course.examCode} 領域${domainId.slice(1)}「${domain.name}」`,
      url,
      sources,
      // aws.amazon.com は公式サイト、docs.aws.amazon.com は公式ドキュメント。表記を正確にするため区別して持つ
      sourceKind: new URL(url).hostname === 'docs.aws.amazon.com' ? 'docs' : 'site',
      checkedAt: CHECKED_AT
    };
  });
}

const AWS_CARDS = AWS_COURSES.flatMap(buildCards);

// 領域ごとの集計単位（弱点判定に使う）。IPA の FIELD_GROUPS とは別に持つ。
const AWS_FIELD_GROUPS = AWS_COURSES.flatMap(c => c.domains.map(d => ({
  id: `${c.exam}-${d.id}`, name: d.name, area: `${c.examCode}（${c.level}）`, exam: c.exam
})));

// 公開用のコース情報（問題本文は含めない）
function awsCourseInfo() {
  return AWS_COURSES.map(({ rows, ...c }) => ({ ...c, total: rows.length }));
}

module.exports = { AWS_COURSES, AWS_CARDS, AWS_FIELD_GROUPS, awsCourseInfo, CHECKED_AT };
