// IPA originals are read in a separate browser tab. No question text, diagrams,
// third-party commentary or model answers are reproduced in this catalog.
const SOURCES = require('./nw-sources.json');
const NW_PARTS = {
  am1: { name: '午前Ⅰ', count: 30, minutes: 2, note: '高度試験共通・50分で30問', kind: 'choice' },
  am2: { name: '午前Ⅱ', count: 25, minutes: 2, note: 'NW専門・40分で25問', kind: 'choice' },
  pm1: { name: '午後Ⅰ', count: 3, minutes: 45, note: '90分で3問中2問を選択', kind: 'written' },
  pm2: { name: '午後Ⅱ', count: 2, minutes: 120, note: '120分で2問中1問を選択', kind: 'written' }
};
const NW_QUESTIONS = SOURCES.flatMap(s => Object.entries(NW_PARTS).flatMap(([part, info]) =>
  Array.from({length:info.count}, (_,i) => ({
    id: `nw-${s.session}-${part}-${i+1}`,
    itemId: `exam:nw-${s.session}-${part}-${i+1}`,
    year:s.year, session:s.session, part, no:i+1,
    title:`${s.year}年（令和${s.year-2018}年）春期 ${info.name} 問${i+1}`,
    sourceLabel:`IPA ${s.year}年度 春期 ${part==='am1'?'高度試験共通（NW）':'ネットワークスペシャリスト'} ${info.name} 問${i+1}`,
    sourceUrl:s.source, ...s.parts[part],
    // Most question PDFs are scans. Do not invent a per-question PDF page.
    pdfPage:null, checkedAt:'2026-10-06',
    contentMode:'official-external', modification:'問題本文・図表・解答例を転載・改変せず、公式PDFを外部参照',
    ...info
  }))));
const NW_QUESTION_MAP = new Map(NW_QUESTIONS.map(q=>[q.itemId,q]));

function nwQuestionText(q) {
  return `${q.sourceLabel}\n\n公式問題冊子を別タブで開き、問${q.no}を解いてください。図表・選択肢・字数制限は原文で確認します。\n`+
    `練習時間の目安: ${q.minutes}分（本試験: ${q.note}）。\n\n`+
    (q.kind==='choice' ? '答案欄に選択肢（ア・イ・ウ・エ）と判断理由を書いてください。' : '大問内の全設問を「設問1(1): …」の形で書いてください。')+
    '\n解き終わってから公式解答例を開き、自己採点します。自己採点とAIの理解度評価は公式の得点ではありません。';
}
function nwQuest(q) {
  return {id:`exam_${q.id}`,itemId:q.itemId,type:'過去問を解く',category:'nw',
    title:`NW ${q.title}`,sourceRef:q.sourceLabel,questionText:nwQuestionText(q),
    url:q.questionPdf,answerUrl:q.answerPdf,recommendedMinutes:q.minutes,
    reason:'ネットワークスペシャリストの公式過去問を解き、判断の根拠とつまずきを記録します。',
    criteria:q.kind==='choice'?'選択肢と理由を書き、公式解答と照合して自己採点すること。':'大問内の全設問に答え、公式解答例と照合して自己採点すること。'};
}
// History is already newest first. Latest attempt, rather than any past success,
// defines the current state. Old IDs and other users' data are never rewritten.
function nwProgress(history) {
  const latest=new Map();
  for(const h of history)if(NW_QUESTION_MAP.has(h.itemId)&&!latest.has(h.itemId))latest.set(h.itemId,h);
  return NW_QUESTIONS.map(q=>({...q,attempted:latest.has(q.itemId),done:latest.get(q.itemId)?.isCorrect===true,
    historyId:latest.get(q.itemId)?.id || null}));
}
module.exports={NW_PARTS,NW_QUESTIONS,NW_QUESTION_MAP,nwQuest,nwQuestionText,nwProgress};
