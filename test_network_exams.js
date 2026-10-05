const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createApp } = require('./lib/app');
const { createFileStorage } = require('./lib/storage-file');
const { NW_QUESTIONS, NW_PARTS, nwProgress } = require('./lib/content/nw-exams');
const { generateQuestCandidates } = require('./lib/quest-engine');

(async () => {
  assert.equal(NW_QUESTIONS.length, 300);
  assert.equal(new Set(NW_QUESTIONS.map(q=>q.itemId)).size, 300);
  for(const year of [2021,2022,2023,2024,2025])for(const [part,info] of Object.entries(NW_PARTS)) {
    const qs=NW_QUESTIONS.filter(q=>q.year===year&&q.part===part);
    assert.equal(qs.length,info.count);
    for(const q of qs) {
      assert.match(q.questionPdf,/^https:\/\/www\.ipa\.go\.jp\/.*_qs\.pdf$/);
      assert.match(q.answerPdf,/^https:\/\/www\.ipa\.go\.jp\/.*_ans\.pdf$/);
      assert(q.questionPdfPages>0 && q.answerPdfPages>0);
      assert.equal(q.pdfPage,null); // Unverified page numbers must never be invented.
      assert.equal(q.contentMode,'official-external');
    }
  }
  const q=NW_QUESTIONS[0];
  const progress=nwProgress([{id:'new',itemId:q.itemId,isCorrect:false},{id:'old',itemId:q.itemId,isCorrect:true}]);
  assert.equal(progress[0].done,false);
  assert.equal(progress[0].historyId,'new');
  const candidates=generateQuestCandidates({store:{items:[],history:[]},category:'nw',minutes:120,goal:'exercise'});
  assert(candidates.every(c=>c.category==='nw'));
  assert(candidates.some(c=>c.itemId.includes('pm1')));
  assert(generateQuestCandidates({store:{items:[],history:[]},category:'nw',minutes:10,goal:'balance'}).every(c=>c.recommendedMinutes<=10));

  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'nw-exam-test-'));
  const storage=createFileStorage(dataDir);
  const seed={items:[{id:'existing-item',type:'catchup',title:'Preserve me',category:'ai',notes:'existing'}],
    history:[{id:'existing-history',itemId:'existing-item',title:'Existing learning',isCorrect:true}],
    quizProgress:{'sc-07_haru-1':{seen:3,correct:2}},quizReports:[],customMetadata:{preserve:true}};
  await storage.save(null,seed);
  const server=http.createServer(createApp({mode:'local',storage,publicDir:path.join(__dirname,'public')}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=async (url,body)=>{
    const r=await fetch(base+url,body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);
    assert(r.ok,`${url}: ${r.status}`); return r.json();
  };
  try {
    let content=await request('/api/content');
    assert.equal(content.network.length,300);
    assert.equal(content.quiz.stats.sc.total,250);
    assert.equal(content.written.length,45);
    for(const part of Object.keys(NW_PARTS)) {
      const question=content.network.find(q=>q.year===2025&&q.part===part);
      const saved=await request('/api/history',{itemId:question.itemId,category:'nw',title:question.title,
        userAnswer:part.startsWith('am')?'エ: 判断根拠':'設問1(1): テスト答案',isCorrect:false,
        questionText:`${question.sourceLabel}: 公式PDFで問${question.no}を解く`,mistakeReason:'知識不足'});
      assert.equal(saved.history.category,'nw');
      assert(saved.history.nextReviewDate);
      content=await request('/api/content');
      assert(content.network.find(q=>q.itemId===question.itemId).attempted);
      const retryStore=await storage.load();
      retryStore.history.find(h=>h.id===saved.history.id).nextReviewDate='2020-01-01T00:00:00Z';
      const retry=generateQuestCandidates({store:retryStore,category:'nw',minutes:120,goal:'weakness'})
        .find(c=>c.historyId===saved.history.id);
      assert.equal(retry.url,question.questionPdf);
      assert.equal(retry.answerUrl,question.answerPdf);
      assert(retry.questionText.includes(`問${question.no}`));
      await request('/api/history',{itemId:question.itemId,retryOf:saved.history.id,category:'nw',
        title:question.title,userAnswer:'まだ誤答の再挑戦',isCorrect:false});
      const fixed=await request('/api/history',{itemId:question.itemId,retryOf:saved.history.id,category:'nw',
        title:question.title,userAnswer:'再挑戦の答案',isCorrect:true});
      assert.equal(fixed.resolvedHistoryId,saved.history.id);
      assert((await storage.load()).history.filter(h=>h.itemId===question.itemId&&!h.isCorrect).every(h=>h.resolved));
    }
    const final=await storage.load();
    assert.deepEqual(final.items,seed.items);
    assert.deepEqual(final.history.find(h=>h.id==='existing-history'),seed.history[0]);
    assert.deepEqual(final.quizProgress,seed.quizProgress);
    assert.deepEqual(final.customMetadata,seed.customMetadata);
    const backup=await request('/api/backup');
    await request('/api/backup',backup);
    assert.equal((await request('/api/content')).network.filter(q=>q.attempted).length,4);
    const html=fs.readFileSync(path.join(__dirname,'public/index.html'),'utf8');
    const js=fs.readFileSync(path.join(__dirname,'public/app.js'),'utf8');
    assert(!html.includes('view-register'));
    assert(!html.includes('formSimpleSC'));
    assert(!js.includes('data-feed='));
    assert(!js.includes('initRegisterForms'));
    console.log('NW: 5 years / 300 units, four-part exercise, source recovery, retry resolution, existing data and backup preservation passed.');
  } finally {
    await new Promise(resolve=>server.close(resolve));
    fs.rmSync(dataDir,{recursive:true,force:true});
  }
})().catch(err=>{console.error(err);process.exitCode=1;});
