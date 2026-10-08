// Real Chromium + local API/storage. No cloud credentials or production data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const {createApp}=require('./lib/app');
const {createFileStorage}=require('./lib/storage-file');
const {NW_QUESTIONS}=require('./lib/content/nw-exams');
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'memorization-ui-'));
  const storage=createFileStorage(dir);
  const server=http.createServer(createApp({mode:'local',storage,publicDir:path.join(__dirname,'public')}));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch();
  fs.mkdirSync('ui-evidence',{recursive:true});
  try {
    for(const width of [375,1280]) {
      await storage.save(null,{items:[],history:[],quizProgress:{},quizReports:[]});
      const page=await browser.newPage({viewport:{width,height:900}});
      let quizSaves=0,nwSaves=0;
      page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/api/quiz/answers'))quizSaves++;if(r.method()==='POST'&&r.url().endsWith('/api/history'))nwSaves++;});
      await page.goto('http://127.0.0.1:'+server.address().port);
      await page.waitForFunction(()=>STATE.library?.network?.length===300 && !document.getElementById('appShell').hidden);
      await page.evaluate(()=>startQuizRun({type:'一問一答',category:'sc',title:'UI regression',quiz:{exam:'sc',count:2,format:'choice'},decisionSource:'manual'}));
      const wrongIndex=await page.evaluate(()=>STATE.quiz.cards[0].choices.findIndex(c=>c!==STATE.quiz.cards[0].answer));
      await page.locator('[data-idx="'+wrongIndex+'"]').click();
      assert.equal(await page.locator('#quizAnswerBox').isVisible(),true);
      assert.match(await page.locator('#quizSelectedAnswer').textContent(),/あなたの回答/);
      assert.equal(await page.evaluate(()=>STATE.quiz.index),0);
      await page.evaluate(()=>chooseQuizAnswer(0)); // repeat must not record twice
      assert.equal(await page.evaluate(()=>STATE.quiz.answers.length),1);
      await page.locator('#quizMistakeReason').selectOption('知識不足');
      await page.locator('#btnQuizNext').click();
      await page.evaluate(()=>chooseQuizAnswer(STATE.quiz.cards[STATE.quiz.index].choices.indexOf(STATE.quiz.cards[STATE.quiz.index].answer)));
      await page.locator('#btnQuizNext').click();
      await page.waitForFunction(()=>STATE.quiz===null);
      const before=await storage.load();
      const wrong=Object.entries(before.quizProgress).find(([,p])=>p.wrong===1);
      assert(wrong);assert.equal(quizSaves,1);
      await page.locator('#btnCompRetry').click();
      assert.equal(await page.evaluate(()=>STATE.quiz.cards.length),1);
      await page.evaluate(()=>chooseQuizAnswer(STATE.quiz.cards[0].choices.indexOf(STATE.quiz.cards[0].answer)));
      await page.locator('#btnQuizNext').click();
      await page.waitForFunction(()=>STATE.quiz===null);
      assert.equal(quizSaves,1,'Practice does not submit or reschedule the first mistake');
      assert.deepEqual((await storage.load()).quizProgress[wrong[0]],wrong[1]);
      // Self assessment stays on feedback, including optional mistake reason.
      await page.evaluate(()=>startQuizRun({type:'一問一答',category:'sc',title:'Self regression',quiz:{exam:'sc',count:1,format:'self'},decisionSource:'manual'}));
      await page.locator('#btnQuizReveal').click();
      await page.locator('#btnQuizWrong').click();
      assert.equal(await page.evaluate(()=>STATE.quiz.index),0);
      assert.equal(await page.locator('#quizMistakeCheck').isVisible(),true);
      await page.evaluate(()=>judgeQuizCard(false));
      assert.equal(await page.evaluate(()=>STATE.quiz.answers.length),1);
      await page.locator('#quizMistakeReason').selectOption('読み落とし');
      await page.route('**/api/quiz/answers',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'test save failure'})}),{times:1});
      await page.locator('#btnQuizNext').click();
      await page.waitForFunction(()=>STATE.quiz && !STATE.quiz.saving && STATE.quiz.index===0);
      assert.equal(await page.locator('#quizAnswerBox').isVisible(),true);
      await page.locator('#btnQuizNext').click();
      await page.waitForFunction(()=>STATE.quiz===null);
      // Actual official question and original pixels, at both screen sizes.
      const q=NW_QUESTIONS.find(q=>q.kind==='choice');
      await page.evaluate(q=>startNetworkQuestion(q),q);
      await page.locator('#nwExercise .nw-original').waitFor();
      await page.locator('#nwExercise').getByRole('button',{name:'拡大 ＋',exact:true}).click();
      assert.equal(await page.locator('#nwExercise .nw-original').evaluate(img=>img.style.width),'150%');
      assert(await page.locator('#nwExercise .nw-image-box').evaluate(box=>box.scrollWidth>box.clientWidth));
      await page.locator('#nwExercise').getByRole('button',{name:'幅に合わせる',exact:true}).click();
      assert.equal(await page.locator('#nwExercise .nw-original').evaluate(img=>img.style.width),'100%');
      const wrongChoice=['ア','イ','ウ','エ'].find(c=>c!==q.correctChoice);
      await page.locator('#nwExercise .nw-choice').getByRole('button',{name:wrongChoice,exact:true}).click();
      await page.locator('#nwExercise').getByRole('button',{name:'回答を採点する',exact:true}).click();
      assert.match(await page.locator('.nw-feedback').textContent(),new RegExp('正解: '+q.correctChoice));
      assert.equal(await page.locator('.nw-feedback').evaluate(el=>document.activeElement===el),true);
      await page.screenshot({path:'ui-evidence/feedback-'+width+'.png',fullPage:true});
      await page.locator('#btnCompleteQuest').click();
      await page.locator('#completionBanner').waitFor({state:'visible'});
      assert.match(await page.locator('#compAnswerNotesText').textContent(),new RegExp('正解: '+q.correctChoice));
      assert.equal(nwSaves,1);
      const firstHistory=(await storage.load()).history.find(h=>h.itemId===q.itemId);
      await page.locator('#btnCompRetry').click();
      await page.locator('#nwExercise .nw-choice').getByRole('button',{name:q.correctChoice,exact:true}).click();
      await page.locator('#nwExercise').getByRole('button',{name:'回答を採点する',exact:true}).click();
      await page.locator('#btnCompleteQuest').click();
      assert.equal(nwSaves,1);
      assert.deepEqual((await storage.load()).history.find(h=>h.id===firstHistory.id),firstHistory);
      // Failure fallback remains visible; paging and fit work on written originals.
      await page.evaluate(q=>startNetworkQuestion(q),NW_QUESTIONS.find(q=>q.kind==='written'&&q.images.length>1));
      await page.locator('#nwExercise .nw-viewer').first().getByRole('button',{name:'次のページ',exact:true}).click();
      assert.match(await page.locator('#nwExercise .nw-viewer').first().getByRole('status').textContent(),/^2 \/ /);
      await page.locator('#nwExercise .nw-original').first().evaluate(img=>img.dispatchEvent(new Event('error')));
      assert.match(await page.locator('#nwExercise .nw-viewer').first().textContent(),/画像を読み込めませんでした/);
      assert(await page.locator('#nwExercise .nw-viewer').first().locator('p.field-hint').isVisible());
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page-wide overflow');
      await page.close();
      console.log('Chromium learning flow passed at '+width+'px');
    }
  } finally {await browser.close();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
