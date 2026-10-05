const { HttpError } = require('./supabase');
function gradeNetworkAnswer(q, body) {
  if(q.kind==='choice') {
    const selected=body.selectedChoice;
    if(!['ア','イ','ウ','エ'].includes(selected))throw new HttpError(400,'選択肢を選んでください');
    const isCorrect=selected===q.correctChoice;
    return {isCorrect,userAnswer:`選択: ${selected}\n${typeof body.userAnswer==='string'?body.userAnswer.slice(0,5000):''}`,
      answers:[{id:'choice',answer:selected,isCorrect,correctChoice:q.correctChoice}],mode:'official-key',score:{correct:isCorrect?1:0,total:1}};
  }
  const expected=q.sections.flatMap(s=>s.subquestions).filter(s=>!s.invalid);
  const supplied=Array.isArray(body.nwAnswers)?body.nwAnswers:[];
  const byId=new Map(supplied.map(a=>[a?.id,a]));
  if(supplied.length!==expected.length||byId.size!==expected.length||expected.some(s=>!byId.has(s.id)))throw new HttpError(400,'採点対象の全設問に回答・自己採点してください');
  const answers=expected.map(s=>{
    const a=byId.get(s.id);
    if(typeof a.answer!=='string'||!a.answer.trim()||typeof a.isCorrect!=='boolean')throw new HttpError(400,'採点対象の全設問に回答・自己採点してください');
    return {id:s.id,answer:a.answer.trim().slice(0,2000),isCorrect:a.isCorrect};
  });
  const correct=answers.filter(a=>a.isCorrect).length;
  return {isCorrect:correct===answers.length,userAnswer:answers.map(a=>`設問${a.id.replace('-','(')+(a.id.includes('-')?')':'')}: ${a.answer}`).join('\n').slice(0,30000),
    answers,mode:'self-assessment',score:{correct,total:answers.length,excluded:q.sections.flatMap(s=>s.subquestions).filter(s=>s.invalid).length}};
}
module.exports={gradeNetworkAnswer};
