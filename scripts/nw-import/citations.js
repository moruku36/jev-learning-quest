const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const qs=require(path.join(root,'lib/content/nw-exams')).NW_QUESTIONS;
fs.writeFileSync(path.join(root,'public/nw-citations.json'),JSON.stringify(qs.map(({id,sourceLabel,pdfPages,answerPages,sourceUrl,questionPdf,answerPdf,modification,invalidNotice})=>({id,sourceLabel,pdfPages,answerPages,sourceUrl,questionPdf,answerPdf,modification,invalidNotice})),null,2)+'\n');
