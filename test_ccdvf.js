// Isolated storage and loopback HTTP only; never use configured production credentials.
process.env.JEV_API_KEY = '';
process.env.ANTHROPIC_API_KEY = '';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const {createApp} = require('./lib/app');
const {createFileStorage} = require('./lib/storage-file');
const {CLAUDE_CARDS, CLAUDE_COURSES, QUIZ_CARDS} = require('./lib/content');
const {buildDeck, applyAnswers, fieldStats, quizStats} = require('./lib/quiz');
const {recommendQuestWithJev} = require('./lib/quest-engine');
const blank = () => ({items:[],history:[],quizProgress:{},quizReports:[]});
(async()=>{
 assert.equal(CLAUDE_CARDS.length,100);
 const html=fs.readFileSync(path.join(__dirname,'public/index.html'),'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'No duplicate element IDs (including existing Claude grading controls)');
 assert.equal(new Set(CLAUDE_CARDS.map(c=>c.id)).size,100);
 assert.equal(new Set(CLAUDE_CARDS.map(c=>c.question)).size,100);
 for(const d of CLAUDE_COURSES[0].domains) assert(CLAUDE_CARDS.filter(c=>c.domain===d.id).length>=4);
 for(const c of CLAUDE_CARDS) {
   assert(c.explanation && c.checkedAt === '2026-10-25');
   assert.equal(new Set([c.answer,...c.distractors]).size,4);
   assert(c.sources.every(u=>/^https:\/\/(platform.claude.com|code.claude.com|www.anthropic.com|modelcontextprotocol.io|everpath-course-content.s3-accelerate.amazonaws.com)\//.test(u)));
 }
 const store=blank();
 assert.deepEqual(['all','aws','gcp','claude'].map(e=>quizStats(store)[e].total),[1050,400,400,100]);
 const deck=buildDeck(store,{exam:'claude',count:20,format:'choice'});
 assert.equal(deck.length,20);
 assert(deck.every(c=>c.choices.length===4 && c.choices.includes(c.answer)));
 assert.equal(buildDeck(store,{exam:'claude',group:'claude-ccdvf-d1',count:100}).length,CLAUDE_CARDS.filter(c=>c.domain==='d1').length);
 const oldCard=QUIZ_CARDS.find(c=>c.family==='ipa');
 applyAnswers(store,[{id:oldCard.id,correct:false}]);
 const original=structuredClone(store.quizProgress[oldCard.id]);
 applyAnswers(store,CLAUDE_CARDS.map(c=>({id:c.id,correct:true})));
 assert.deepEqual(store.quizProgress[oldCard.id],original);
 assert.equal(buildDeck(store,{exam:'claude',mode:'practice',count:20}).length,20,'Restart works even when every card was studied');
 assert.equal(buildDeck(store,{exam:'claude',mode:'review',count:20}).length,0,'Review remains due-only');
 assert.equal(fieldStats(store,{exam:'claude'}).length,8);
 for(const count of [5,10,20,30]) {
   const result=await recommendQuestWithJev({store,category:'claude',minutes:20,goal:'balance',count,quickStudy:true,apiKey:''});
   assert.equal(result.quest.quiz.count,count);
   assert.equal(result.quest.category,'claude');
   const nw=await recommendQuestWithJev({store,category:'nw',minutes:20,goal:'balance',count,quickStudy:true,apiKey:''});
   assert.equal(nw.quest.networkSeries.length,count);
   assert.equal(new Set(nw.quest.networkSeries.map(q=>q.itemId)).size,count);
   assert(nw.quest.networkSeries.every(q=>q.kind==='choice'));
 }
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ccdvf-test-'));
 const storage=createFileStorage(dir);
 const legacy={...blank(),items:[{id:'legacy-ai',category:'ai',title:'保存する旧教材'}],quizProgress:{[oldCard.id]:original},history:[{id:'old-history',category:'cloud',title:'旧履歴'}]};
 await storage.save(null,legacy);
 const server=http.createServer(createApp({mode:'local',storage,publicDir:path.join(__dirname,'public')}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const call=async(route,body)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+route,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);assert(r.ok,route);return r.json();};
 try {
   const rec=await call('/api/quest/recommend',{category:'claude',quickStudy:true,count:20});
   assert.equal(rec.quest.quiz.count,20);
   for (const claudeCourse of ['all','ccdvf','unknown']) {
     const scoped = await call('/api/quest/recommend',{category:'claude',claudeCourse,quickStudy:true,count:10});
     assert.equal(scoped.quest.quiz.count,10);
     assert(scoped.allCandidates.every(c => c.category === 'claude' && c.quiz.exam === 'claude-ccdvf'));
   }
   const catalog = (await call('/api/content')).claude;
   assert.deepEqual(catalog.courses.map(c => [c.id,c.exam]),[['ccdvf','claude-ccdvf']]);
   const cards=(await call('/api/quiz/deck?exam=claude-ccdvf&mode=practice&count=20&format=choice')).cards;
   assert.equal(cards.length,20);
   await call('/api/quiz/answers',{title:'Claude test',answers:[{id:cards[0].id,correct:false}]});
   const saved=await storage.load();
   assert.equal(saved.history[0].category,'claude');
   assert(saved.history.some(h=>h.id==='old-history'));
   assert(saved.items.some(i=>i.id==='legacy-ai'));
   assert.deepEqual(saved.quizProgress[oldCard.id],original);
   assert.equal((await call('/api/content')).claude.stats.studied,1);
   assert.equal((await call('/api/history')).claudeStats.studied,1);
   const hundred=(await call('/api/quiz/deck?exam=claude-ccdvf&mode=practice&count=100&format=choice')).cards;
   assert.equal(hundred.length,100);
   assert.equal(new Set(hundred.map(c=>c.id)).size,100);
   await call('/api/quiz/answers',{title:'100-question session',answers:hundred.map(c=>({id:c.id,correct:true}))});
   assert.equal((await call('/api/content')).claude.stats.studied,100);
   const explicit=await call('/api/quest/recommend',{category:'claude',quickStudy:true,count:100});
   assert.equal(explicit.quest.quiz.count,100);
   const legacyLong=await call('/api/quest/recommend',{category:'claude',minutes:60,goal:'balance'});
   assert(legacyLong.allCandidates.filter(c=>c.quiz).every(c=>c.quiz.count<=30),'Legacy time-based sessions retain their 30-card cap');
   const legacyRec=await call('/api/quest/recommend',{category:'sc',minutes:10,goal:'balance'});
   assert(legacyRec.allCandidates.some(c=>c.quiz?.count===10),'Old clients keep time-derived count');
 } finally {await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
 console.log('CCDV-F: 100 original cards, 8 domains, counts/restart/short deck, API storage and legacy preservation passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
