// 公式試験ガイドで2026-10-22に確認。旧製品名ではなく現行ガイドの表記に合わせる。
const rows = require('./cards');
const CHECKED_AT = '2026-10-22';
const G = 'https://services.google.com/fh/files/misc/';
const GCP_COURSES = [
  { id: 'gai', exam: 'gcp-gai', level: '基礎AI', name: 'Generative AI Leader', shortName: 'Generative AI Leader', examCode: 'Generative AI Leader', guideUrl: G+'generative_ai_leader_exam_guide_english.pdf', domains: [
    {id:'d1',name:'生成AIの基礎',weight:30},{id:'d2',name:'Google Cloudの生成AI製品',weight:35},{id:'d3',name:'生成AIの出力改善',weight:20},{id:'d4',name:'導入戦略と責任あるAI',weight:15}
  ], rows: rows.gai },
  { id: 'cdl', exam: 'gcp-cdl', level: '基礎', name: 'Cloud Digital Leader', shortName: 'Cloud Digital Leader', examCode: 'Cloud Digital Leader', guideUrl: G+'cloud_digital_leader_exam_guide_english.pdf', domains: [
    {id:'d1',name:'Google Cloudによるデジタル変革',weight:18},{id:'d2',name:'データ変革',weight:18},{id:'d3',name:'Google CloudとAI',weight:18},{id:'d4',name:'インフラとアプリのモダナイズ',weight:18},{id:'d5',name:'信頼とセキュリティ',weight:18},{id:'d6',name:'クラウド運用',weight:10}
  ], rows: rows.cdl },
  { id: 'ace', exam: 'gcp-ace', level: '管理・中級', name: 'Associate Cloud Engineer', shortName: 'Associate Cloud Engineer', examCode: 'Associate Cloud Engineer', guideUrl: G+'associate_cloud_engineer_exam_guide_english.pdf', domains: [
    {id:'d1',name:'クラウド環境の設定',weight:20},{id:'d2',name:'ソリューションの計画と実装',weight:30},{id:'d3',name:'ソリューションの運用',weight:30},{id:'d4',name:'アクセスとセキュリティ',weight:20}
  ], rows: rows.ace },
  { id: 'pca', exam: 'gcp-pca', level: '設計・上級', name: 'Professional Cloud Architect', shortName: 'Professional Cloud Architect', examCode: 'Professional Cloud Architect', guideUrl: G+'professional_cloud_architect_exam_guide_english.pdf', notice: '本コースは標準試験の公開領域に沿う知識確認です。標準試験のケーススタディや複数要件の総合判断を再現するものではありません。', domains: [
    {id:'d1',name:'クラウド設計と計画',weight:25},{id:'d2',name:'インフラの管理と構築',weight:17.5},{id:'d3',name:'セキュリティとコンプライアンス',weight:17.5},{id:'d4',name:'技術・事業プロセスの最適化',weight:15},{id:'d5',name:'実装の管理',weight:12.5},{id:'d6',name:'運用の卓越性',weight:12.5}
  ], rows: rows.pca }
];

const GCP_CARDS = GCP_COURSES.flatMap(course => course.rows.map(([domainId, kind, topic, question, answer, explanation], i) => {
  const domain = course.domains.find(d => d.id === domainId);
  if (!domain) throw new Error(`GCP問題 ${course.id}/${i}: 未定義の領域 ${domainId}`);
  return { id: `gcp-${course.id}-${domainId}-${String(i+1).padStart(2,'0')}`, family:'gcp', exam:course.exam, course:course.id,
    examCode:course.examCode, session:null, sessionLabel:'', no:i+1, topic, question, answer, explanation, kind,
    field:domain.name, domain:domainId, group:`${course.exam}-${domainId}`,
    sourceLabel:`Google Cloud ${course.name} 領域${domainId.slice(1)}「${domain.name}」`,
    url:course.guideUrl, sources:[course.guideUrl], sourceKind:'guide', checkedAt:CHECKED_AT };
}));
const GCP_FIELD_GROUPS = GCP_COURSES.flatMap(c => c.domains.map(d => ({id:`${c.exam}-${d.id}`,name:d.name,area:`${c.name}（${c.level}）`,exam:c.exam})));
function gcpCourseInfo() { return GCP_COURSES.map(({rows,...c}) => ({...c,total:rows.length})); }
module.exports = {GCP_COURSES,GCP_CARDS,GCP_FIELD_GROUPS,gcpCourseInfo,CHECKED_AT};
