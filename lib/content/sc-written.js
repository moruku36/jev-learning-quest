// 支援士 午後I・午後II（令和5年春期まで）/ 科目B（令和5年秋期から）の過去問リスト
// 問題冊子と解答例は IPA 公式サイトの PDF にリンクする（本文はアプリに同梱しない）。
//   [試験回, 区分, 問番号, テーマ, 問題冊子PDF, 解答例PDF]
const ROWS = [
  ["07_aki","pm",1,"コンサルティング業務で利用するSaaS","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_pm_ans.pdf"],
  ["07_aki","pm",2,"暗号資産交換業におけるセキュリティ","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_pm_ans.pdf"],
  ["07_aki","pm",3,"情報システムのセキュリティ強化","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_pm_ans.pdf"],
  ["07_aki","pm",4,"製造業におけるセキュリティ管理","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07a_sc_pm_ans.pdf"],
  ["07_haru","pm",1,"サプライチェーンのリスク対策","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_pm_ans.pdf"],
  ["07_haru","pm",2,"脆弱性管理","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_pm_ans.pdf"],
  ["07_haru","pm",3,"スマートフォン向けアプリケーションプログラムの開発","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_pm_ans.pdf"],
  ["07_haru","pm",4,"IT資産管理及び脆弱性管理","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_sc_pm_ans.pdf"],
  ["06_aki","pm",1,"インシデントレスポンス","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_pm_ans.pdf"],
  ["06_aki","pm",2,"ドメイン名変更","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_pm_ans.pdf"],
  ["06_aki","pm",3,"クレジットカード情報の漏えい","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_pm_ans.pdf"],
  ["06_aki","pm",4,"セキュリティ診断","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_sc_pm_ans.pdf"],
  ["06_haru","pm",1,"APIセキュリティ","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_pm_ans.pdf"],
  ["06_haru","pm",2,"サイバー攻撃への対策","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_pm_ans.pdf"],
  ["06_haru","pm",3,"Webセキュリティ","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_pm_ans.pdf"],
  ["06_haru","pm",4,"Webアプリケーションプログラム","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_sc_pm_ans.pdf"],
  ["05_aki","pm",1,"Webアプリケーションプログラムの開発","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_pm_ans.pdf"],
  ["05_aki","pm",2,"セキュリティ対策の見直し","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_pm_ans.pdf"],
  ["05_aki","pm",3,"継続的インテグレーションサービスのセキュリティ","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_pm_ans.pdf"],
  ["05_aki","pm",4,"リスクアセスメント","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_pm_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05a_sc_pm_ans.pdf"],
  ["05_haru","pm1",1,"Webアプリケーションプログラム開発","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_pm1_ans.pdf"],
  ["05_haru","pm1",2,"セキュリティインシデント","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_pm1_ans.pdf"],
  ["05_haru","pm1",3,"クラウドサービス利用","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_pm1_ans.pdf"],
  ["05_haru","pm2",1,"Webセキュリティ","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_pm2_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_pm2_ans.pdf"],
  ["05_haru","pm2",2,"Webサイトのクラウドサービスへの移行と機能拡張","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_pm2_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/ps6vr70000010d6y-att/2023r05h_sc_pm2_ans.pdf"],
  ["04_aki","pm1",1,"IoT製品の開発","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_pm1_ans.pdf"],
  ["04_aki","pm1",2,"脆弱性に起因するセキュリティインシデントへの対応","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_pm1_ans.pdf"],
  ["04_aki","pm1",3,"オンラインゲーム事業者でのセキュリティ対策インシデント対応","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_pm1_ans.pdf"],
  ["04_aki","pm2",1,"脅威情報調査","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_pm2_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_pm2_ans.pdf"],
  ["04_aki","pm2",2,"インシデントレスポンスチーム","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_pm2_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_sc_pm2_ans.pdf"],
  ["04_haru","pm1",1,"Webアプリケーションプログラム開発のセキュリティ対策","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_pm1_ans.pdf"],
  ["04_haru","pm1",2,"セキュリティインシデント対応","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_pm1_ans.pdf"],
  ["04_haru","pm1",3,"スマートフォン向けQRコード決済サービス","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_pm1_ans.pdf"],
  ["04_haru","pm2",1,"Webサイトのセキュリティ","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_pm2_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_pm2_ans.pdf"],
  ["04_haru","pm2",2,"クラウドサービスへの移行","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_pm2_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000009sgk-att/2022r04h_sc_pm2_ans.pdf"],
  ["03_aki","pm1",1,"セキュリティインシデント","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_pm1_ans.pdf"],
  ["03_aki","pm1",2,"システム開発での情報漏えい対策","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_pm1_ans.pdf"],
  ["03_aki","pm1",3,"PCのマルウェア対策","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_pm1_ans.pdf"],
  ["03_aki","pm2",1,"協力会社とのファイルの受渡し","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_pm2_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_pm2_ans.pdf"],
  ["03_aki","pm2",2,"マルウェア感染への対処","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_pm2_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000apad-att/2021r03a_sc_pm2_ans.pdf"],
  ["03_haru","pm1",1,"認証システムの開発","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_pm1_ans.pdf"],
  ["03_haru","pm1",2,"ネットワークのセキュリティ対策","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_pm1_ans.pdf"],
  ["03_haru","pm1",3,"セキュリティ運用","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_pm1_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_pm1_ans.pdf"],
  ["03_haru","pm2",1,"インシデント対応体制の整備","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_pm2_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_pm2_ans.pdf"],
  ["03_haru","pm2",2,"クラウドセキュリティ","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_pm2_qs.pdf","https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000d5ru-att/2021r03h_sc_pm2_ans.pdf"]
];

const PARTS = {
  pm1: { name: '午後I', minutes: 45, note: '90分で3問中2問を選択' },
  pm2: { name: '午後II', minutes: 60, note: '120分で2問中1問を選択（1問を約60分で区切って演習）' },
  pm: { name: '科目B', minutes: 60, note: '120分で4問中2問を選択' }
};

function sessionLabel(session) {
  const [year, term] = session.split('_');
  return `令和${parseInt(year, 10)}年${term === 'haru' ? '春期' : '秋期'}`;
}

const SC_WRITTEN = ROWS.map(([session, part, no, theme, questionPdf, answerPdf]) => ({
  id: `sc-${session}-${part}-${no}`,
  session,
  part,
  no,
  theme,
  title: `${sessionLabel(session)} ${PARTS[part].name} 問${no}「${theme}」`,
  minutes: PARTS[part].minutes,
  note: PARTS[part].note,
  questionPdf,
  answerPdf,
  siteUrl: `https://www.sc-siken.com/kakomon/${session}/`
}));

module.exports = { SC_WRITTEN };
