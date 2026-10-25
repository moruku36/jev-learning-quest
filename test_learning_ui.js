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
const {QUIZ_CARDS}=require('./lib/content');
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
      // Compact library: one collection/course, bounded rows and focus after pagination.
      await page.getByRole('button',{name:'📝 試験問題',exact:true}).click();
      for (const section of ['aws','gcp','claude','nw','ipa','written']) {
        await page.locator('#librarySection').selectOption(section);
        assert.equal(await page.locator('[data-library-section]:visible').count(),1);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Library has no horizontal overflow');
        if(width===1280)assert(await page.evaluate(()=>document.querySelector('[data-library-section]:not([hidden])').getBoundingClientRect().bottom<=innerHeight),'Main library controls fit the desktop viewport: '+section);
      }
      await page.locator('#librarySection').selectOption('nw');
      assert.equal(await page.locator('#nwList [data-nw]').count(),2);
      await page.locator('#nwNext').click();
      assert.equal(await page.evaluate(()=>document.activeElement.id),'nwPageStatus');
      assert((await page.locator('#nwPageStatus').textContent()).includes('3–4 / 25'));
      await page.locator('#nwPart').selectOption('pm2');
      assert((await page.locator('#nwPageStatus').textContent()).includes('1–2 / 2'));
      assert.equal(await page.locator('#nwNext').isDisabled(),true);
      await page.locator('#librarySection').selectOption('claude');
      await page.locator('#libraryCount').selectOption('100');
      await page.locator('#btnClaudeStudy').click();
      await page.waitForFunction(()=>STATE.quiz?.cards.length===100);
      assert.equal(await page.evaluate(()=>new Set(STATE.quiz.cards.map(c=>c.id)).size),100);
      await page.locator('#btnQuizReveal').click();
      assert.equal(await page.locator('#quizAnswerBox').isVisible(),true);
      await page.locator('#btnQuizQuit').click(); // no judgments, so no stored results
      await page.evaluate(()=>switchTab('quest'));
      await page.evaluate(()=>startQuizRun({type:'一問一答',category:'sc',title:'UI regression',quiz:{exam:'sc',count:2,format:'choice'},decisionSource:'manual'}));
      // Choice format is a hint only: no clickable choices, no grading, the key appears on reveal.
      assert.equal(await page.locator('#quizChoices button').count(),0);
      assert.equal(await page.locator('#quizChoices .quiz-choice').count(),4);
      assert.equal(await page.locator('#quizAnswerBox').isVisible(),false);
      assert.equal(await page.evaluate(()=>typeof chooseQuizAnswer),'undefined');
      await page.locator('#quizChoices .quiz-choice').first().click();
      assert.equal(await page.evaluate(()=>STATE.quiz.answers.length),0,'Tapping a choice does not grade');
      await page.locator('#btnQuizReveal').click();
      assert.equal(await page.locator('#quizAnswerBox').isVisible(),true);
      assert.equal(await page.locator('#quizAnswer').textContent(),await page.evaluate(()=>STATE.quiz.cards[0].answer));
      assert.equal(await page.locator('#quizChoices .quiz-choice.correct').count(),1);
      assert.equal(await page.evaluate(()=>STATE.quiz.answers.length),0,'Revealing the answer is not a result');
      // Document-relative positions: boundingBox() is viewport-relative and click() scrolls the page.
      const docRect=id=>page.evaluate(id=>{const r=document.getElementById(id).getBoundingClientRect();return {top:Math.round(r.top+scrollY),bottom:Math.round(r.bottom+scrollY)};},id);
      const judgeBefore=await docRect('btnQuizWrong');
      await page.locator('#btnQuizWrong').click();
      assert.equal(await page.evaluate(()=>STATE.quiz.index),0);
      assert.match(await page.locator('#quizAnswerLabel').textContent(),/正解/);
      await page.evaluate(()=>judgeQuizCard(true)); // repeat must not record twice
      // The judge row stays put and disabled; "next" is a separate row and ignores input right after judging.
      assert.equal(await page.locator('#btnQuizWrong').isDisabled(),true);
      assert.equal(await page.locator('#quizJudge').isVisible(),true);
      const judgeBox=await docRect('btnQuizWrong'),nextBox=await docRect('btnQuizNext');
      assert.equal(judgeBox.top,judgeBefore.top,'Judging must not shift the judge row (no misclick on what moves in)');
      assert(nextBox.top>=judgeBox.bottom-1,'next is below the judge row, not on top of it');
      // The exact 600ms boundary is covered on a controlled clock in test_quiz_guard.js; here Next is
      // simply disabled until it is actionable, and a click on it waits for that.
      await page.waitForFunction(()=>!document.getElementById('btnQuizNext').disabled);
      assert.equal(await page.evaluate(()=>STATE.quiz.answers.length),1);
      assert.equal(await page.evaluate(()=>STATE.quiz.answers[0].correct),false);
      await page.locator('#quizMistakeReason').selectOption('知識不足');
      await page.locator('#btnQuizNext').click(); // waits until Next is enabled
      await page.locator('#btnQuizReveal').click();
      const stray=await page.evaluate(()=>{ // one synchronous task: judge, then stray click/Enter on Next
        judgeQuizCard(true);const b=document.getElementById('btnQuizNext'),r={disabled:b.disabled,label:document.getElementById('quizNextLabel').textContent};
        b.click();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));r.index=STATE.quiz.index;return r;
      });
      assert.equal(stray.disabled,true);assert.match(stray.label,/反映中/);assert.equal(stray.index,1,'Stray click/Enter right after judging does not skip the card');
      await page.locator('#btnQuizNext').click(); // waits until Next is enabled
      await page.waitForFunction(()=>STATE.quiz===null);
      const before=await storage.load();
      const wrong=Object.entries(before.quizProgress).find(([,p])=>p.wrong===1);
      assert(wrong);assert.equal(quizSaves,1);
      await page.locator('#btnCompRetry').click();
      assert.equal(await page.evaluate(()=>STATE.quiz.cards.length),1);
      await page.locator('#btnQuizReveal').click();
      await page.locator('#btnQuizRight').click();
      await page.locator('#btnQuizNext').click(); // waits until Next is enabled
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
      await page.locator('#btnQuizNext').click(); // waits until Next is enabled
      await page.waitForFunction(()=>STATE.quiz && !STATE.quiz.saving && STATE.quiz.index===0);
      assert.equal(await page.locator('#quizAnswerBox').isVisible(),true);
      await page.locator('#btnQuizNext').click(); // waits until Next is enabled
      await page.waitForFunction(()=>STATE.quiz===null);
      // Offline first answer is queued once; practice does not queue a second result.
      const offlineCard=QUIZ_CARDS.find(c=>!before.quizProgress[c.id]);
      const storedBeforeOffline=await storage.load();
      await page.evaluate(card=>{
        storageSet(OFFLINE_DECK_KEY,JSON.stringify([card]));STATE.offline=true;
        return startQuizRun({type:'一問一答',category:'sc',title:'Offline regression',quiz:{exam:'all',count:1,format:'self'},decisionSource:'offline'});
      },offlineCard);
      await page.locator('#btnQuizReveal').click();
      await page.locator('#btnQuizWrong').click();
      await page.locator('#btnQuizNext').click(); // waits until Next is enabled
      assert.equal(await page.evaluate(()=>loadPendingResults().length),1);
      assert.deepEqual((await storage.load()).quizProgress,storedBeforeOffline.quizProgress);
      await page.locator('#btnCompRetry').click();
      await page.locator('#btnQuizReveal').click();
      await page.locator('#btnQuizRight').click();
      await page.locator('#btnQuizNext').click(); // waits until Next is enabled
      assert.equal(await page.evaluate(()=>loadPendingResults().length),1);
      await page.evaluate(async()=>{STATE.offline=false;updateOfflineUi();await flushPendingQuizResults();}); // same steps as the real 'online' handler
      assert.equal(await page.evaluate(()=>loadPendingResults().length),0);
      assert.equal((await storage.load()).quizProgress[offlineCard.id].wrong,1);
      // Actual official question and original pixels, at both screen sizes.
      // A partial quit failing to save must keep both DOM and index on the same card.
      await page.evaluate(()=>startQuizRun({type:'一問一答',category:'sc',title:'Partial save regression',quiz:{exam:'sc',count:3,format:'self'},decisionSource:'manual'}));
      const partialIds=await page.evaluate(()=>STATE.quiz.cards.map(c=>c.id));
      const partialBefore=await storage.load();
      await page.locator('#btnQuizReveal').click();
      await page.locator('#btnQuizRight').click();
      await page.locator('#btnQuizNext').click(); // waits until Next is enabled
      const secondQuestion=await page.locator('#quizQuestion').textContent();
      await page.route('**/api/quiz/answers',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'partial save failure'})}),{times:1});
      page.once('dialog',dialog=>dialog.accept());
      await page.locator('#btnQuizQuit').click();
      await page.waitForFunction(()=>STATE.quiz && !STATE.quiz.saving);
      assert.equal(await page.evaluate(()=>STATE.quiz.index),1);
      assert.equal(await page.locator('#quizQuestion').textContent(),secondQuestion);
      assert.deepEqual(await page.evaluate(()=>STATE.quiz.answers.map(a=>a.id)),[partialIds[0]]);
      assert.equal(await page.evaluate(()=>document.getElementById('quizQuestion').textContent===STATE.quiz.cards[STATE.quiz.index].question),true);
      assert.deepEqual((await storage.load()).quizProgress,partialBefore.quizProgress);
      // Resume the visible question, then retry saving the partial result.
      await page.locator('#btnQuizReveal').click();
      await page.locator('#btnQuizWrong').click();
      await page.locator('#quizMistakeReason').selectOption('知識不足');
      page.once('dialog',dialog=>dialog.accept());
      await page.locator('#btnQuizQuit').click();
      await page.waitForFunction(()=>STATE.quiz===null);
      const partialSaved=await storage.load();
      assert.equal(partialSaved.quizProgress[partialIds[0]].correct,1);
      assert.equal(partialSaved.quizProgress[partialIds[1]].wrong,1);
      assert.deepEqual(partialSaved.quizProgress[partialIds[2]],partialBefore.quizProgress[partialIds[2]]);
      // Practice quit describes its actual behavior and sends nothing.
      const savesBeforePracticeQuit=quizSaves;
      await page.locator('#btnCompRetry').click();
      assert.match(await page.locator('#quizTitle').textContent(),/保存しません/);
      await page.locator('#btnQuizReveal').click();
      await page.locator('#btnQuizRight').click();
      let practiceDialog='';
      page.once('dialog',async dialog=>{practiceDialog=dialog.message();await dialog.accept();});
      await page.locator('#btnQuizQuit').click();
      await page.waitForFunction(()=>STATE.quiz===null);
      assert.match(practiceDialog,/保存されません/);
      assert.equal(quizSaves,savesBeforePracticeQuit);
      assert.deepEqual((await storage.load()).quizProgress,partialSaved.quizProgress);
      const q=NW_QUESTIONS.find(q=>q.kind==='choice');
      await page.evaluate(q=>startNetworkQuestion(q),q);
      await page.locator('#nwExercise .nw-original').waitFor();
      await page.locator('#nwExercise').getByRole('button',{name:'拡大 ＋',exact:true}).click();
      assert.equal(await page.locator('#nwExercise .nw-original').evaluate(img=>img.style.width),'150%');
      assert(await page.locator('#nwExercise .nw-image-box').evaluate(box=>box.scrollWidth>box.clientWidth));
      await page.locator('#nwExercise').getByRole('button',{name:'幅に合わせる',exact:true}).click();
      assert.equal(await page.locator('#nwExercise .nw-original').evaluate(img=>img.style.width),'100%');
      // Recall flow: key hidden, reveal alone is not a result, only the self-judgement is saved.
      assert.equal(await page.locator('.nw-feedback').isVisible(),false);
      assert.equal(await page.locator('#nwExercise .nw-choice').count(),0);
      await page.locator('#btnCompleteQuest').click();
      assert.equal(nwSaves,0,'Nothing is saved before reveal and judgement');
      await page.locator('#nwExercise').getByRole('button',{name:'答えを見る',exact:true}).click();
      assert.match(await page.locator('.nw-feedback').textContent(),new RegExp('正解: '+q.correctChoice));
      assert.equal(await page.locator('.nw-feedback').evaluate(el=>document.activeElement===el),true);
      await page.screenshot({path:'ui-evidence/feedback-'+width+'.png',fullPage:true});
      await page.locator('#btnCompleteQuest').click();
      assert.equal(nwSaves,0,'Revealing the answer is not counted as correct');
      assert.equal((await storage.load()).history.some(h=>h.itemId===q.itemId),false);
      await page.locator('#nwExercise .nw-judge').getByRole('button',{name:'❌ 覚えていない'}).click();
      await page.locator('#btnCompleteQuest').click();
      await page.locator('#completionBanner').waitFor({state:'visible'});
      assert.match(await page.locator('#compAnswerNotesText').textContent(),new RegExp('正解: '+q.correctChoice));
      assert.equal(nwSaves,1);
      const firstHistory=(await storage.load()).history.find(h=>h.itemId===q.itemId);
      await page.locator('#btnCompRetry').click();
      assert.equal(await page.locator('#btnCompleteQuest').textContent(),'練習を終了');
      assert.match(await page.locator('#runTitle').textContent(),/保存しません/);
      await page.locator('#nwExercise').getByRole('button',{name:'答えを見る',exact:true}).click();
      await page.locator('#nwExercise .nw-judge').getByRole('button',{name:'⭕ 覚えていた'}).click();
      await page.locator('#btnCompleteQuest').click();
      assert.equal(nwSaves,1);
      assert.deepEqual((await storage.load()).history.find(h=>h.id===firstHistory.id),firstHistory);
      // Failure fallback remains visible; paging and fit work on written originals.
      await page.evaluate(q=>startNetworkQuestion(q),NW_QUESTIONS.find(q=>q.kind==='written'&&q.images.length>1));
      await page.locator('#nwExercise .nw-viewer').first().getByRole('button',{name:'次のページ',exact:true}).click();
      assert.match(await page.locator('#nwExercise .nw-viewer').first().getByRole('status').textContent(),/^2 \/ /);
      await page.locator('#nwExercise .nw-original').first().evaluate(img=>{img.src='/nw-assets/missing-image-test.webp';});
      await page.locator('#nwExercise .nw-viewer').first().locator('p.field-hint').waitFor({state:'visible'});
      assert.match(await page.locator('#nwExercise .nw-viewer').first().textContent(),/画像を読み込めませんでした/);
      assert(await page.locator('#nwExercise .nw-viewer').first().locator('p.field-hint').isVisible());
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page-wide overflow');
      // 分野: 旧3分野は選べず、AWS を選ぶとコース選択が出る。AWS も「答えを見る→自己判定」で、答えだけでは記録されない。
      await page.evaluate(()=>{switchTab('quest');});
      const pickerState=await page.evaluate(()=>({tab:STATE.activeTab,offline:STATE.offline,filterBarHidden:document.querySelector('.filter-bar').hidden}));
      assert.deepEqual(pickerState,{tab:'quest',offline:false,filterBarHidden:false},'The field picker is visible when online: '+JSON.stringify(pickerState));
      assert.deepEqual(await page.locator('#catPills .pill').allTextContents(),['すべて','ネットワーク','情報処理安全確保支援士','AWS','GCP','Claude']);
      assert.equal(await page.locator('#awsCourseGroup').isVisible(),false);
      assert.equal(await page.locator('#gcpCourseGroup').isVisible(),false);
      await page.locator('#catPills').getByRole('button',{name:'AWS',exact:true}).click();
      await page.locator('#awsCourseGroup').waitFor({state:'visible'});
      // wait for the recommendation request started by the click, so it cannot replace the quiz started below
      await page.waitForFunction(()=>STATE.currentQuest && STATE.currentQuest.category==='aws' && !document.getElementById('btnStartHero').disabled);
      assert.deepEqual(await page.locator('#awsCoursePills .pill').allTextContents(),
        ['すべて','基礎AI AIF-C01','基礎 CLF-C02','設計・中級 SAA-C03','設計・上級 SAP-C02']);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page-wide overflow on the field picker');
      await page.evaluate(()=>{STATE.quiz=null;document.getElementById('quizRunCard').hidden=true;document.getElementById('completionBanner').hidden=true;});
      const awsSavesBefore=quizSaves;
      await page.evaluate(()=>startQuizRun({type:'一問一答',category:'aws',title:'AWS regression',quiz:{exam:'aws-clf',count:2,format:'self'},decisionSource:'manual'}));
      assert.equal(await page.evaluate(()=>STATE.quiz.cards.every(c=>c.exam==='aws-clf'&&!c.choices)),true,'AWS cards are recall cards, not graded choices');
      await page.locator('#btnQuizReveal').click();
      assert.equal(await page.evaluate(()=>STATE.quiz.answers.length),0,'Showing the AWS answer records nothing');
      assert.match(await page.locator('#quizSourceLink').textContent(),/AWS公式/);
      await page.locator('#btnQuizRight').click();
      await page.locator('#btnQuizNext').click(); // waits until Next is enabled
      await page.locator('#btnQuizReveal').click();
      await page.locator('#btnQuizWrong').click();
      await page.locator('#btnQuizNext').click();
      await page.waitForFunction(()=>STATE.quiz===null);
      assert.equal(quizSaves-awsSavesBefore,1,'One save for the AWS run');
      const awsStored=await storage.load();
      assert.equal(awsStored.history.find(h=>h.title==='AWS regression').category,'aws');
      assert.equal(Object.keys(awsStored.quizProgress).filter(id=>id.startsWith('aws-clf-')).length,2);
      await page.evaluate(()=>switchTab('library'));
      await page.locator('#librarySection').selectOption('aws');
      await page.locator('#awsCourseGrid .aws-course').first().waitFor();
      assert.equal(await page.locator('#awsCourseGrid .aws-course').count(),1);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page-wide overflow on the AWS course card');
      await page.evaluate(()=>switchTab('quest'));
      await page.locator('#catPills').getByRole('button',{name:'GCP',exact:true}).click();
      await page.locator('#gcpCourseGroup').waitFor({state:'visible'});
      assert.equal(await page.locator('#awsCourseGroup').isVisible(),false);
      assert.deepEqual(await page.locator('#gcpCoursePills .pill').allTextContents(),
        ['すべて','基礎AI Gen AI Leader','基礎 Digital Leader','管理・中級 Cloud Engineer','設計・上級 Cloud Architect']);
      await page.locator('#gcpCoursePills [data-val="gai"]').click();
      await page.waitForFunction(()=>STATE.currentQuest?.category==='gcp' && STATE.currentQuest?.quiz?.exam==='gcp-gai');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page-wide overflow on the GCP picker');
      await page.evaluate(()=>{STATE.quiz=null;document.getElementById('quizRunCard').hidden=true;document.getElementById('completionBanner').hidden=true;});
      const gcpSavesBefore=quizSaves;
      await page.evaluate(()=>startQuizRun({type:'一問一答',category:'gcp',title:'GCP regression',quiz:{exam:'gcp-gai',count:2,format:'self'},decisionSource:'manual'}));
      assert.equal(await page.evaluate(()=>STATE.quiz.cards.every(c=>c.exam==='gcp-gai'&&!c.choices)),true);
      assert.equal(await page.locator('#quizAnswerBox').isVisible(),false);
      await page.locator('#btnQuizReveal').click();
      assert.equal(await page.locator('#quizAnswerBox').isVisible(),true);
      assert.equal(await page.evaluate(()=>STATE.quiz.answers.length),0,'Showing the GCP answer records nothing');
      assert.match(await page.locator('#quizSourceLink').textContent(),/Google Cloud/);
      await page.locator('#btnQuizRight').click();
      await page.locator('#btnQuizNext').click();
      await page.locator('#btnQuizReveal').click();
      await page.locator('#btnQuizWrong').click();
      await page.locator('#btnQuizNext').click();
      await page.waitForFunction(()=>STATE.quiz===null);
      assert.equal(quizSaves-gcpSavesBefore,1,'One save for the GCP run');
      const gcpStored=await storage.load();
      assert.equal(gcpStored.history.find(h=>h.title==='GCP regression').category,'gcp');
      assert.equal(Object.keys(gcpStored.quizProgress).filter(id=>id.startsWith('gcp-gai-')).length,2);
      await page.evaluate(()=>switchTab('library'));
      await page.locator('#librarySection').selectOption('gcp');
      await page.locator('#gcpCourseGrid .aws-course').first().waitFor();
      assert.equal(await page.locator('#gcpCourseGrid .aws-course').count(),1);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page-wide overflow on the GCP course card');
      await page.evaluate(()=>switchTab('quest'));
      // Real keys: Space/Y/N, held (repeat:true) keys, and Enter on a focused link must not skip or double-judge.
      await page.evaluate(()=>{STATE.quiz=null;document.getElementById('quizRunCard').hidden=true;document.getElementById('completionBanner').hidden=true;});
      await page.evaluate(()=>startQuizRun({type:'一問一答',category:'sc',title:'Keys regression',quiz:{exam:'sc',count:2,format:'self'},decisionSource:'manual'}));
      const held=keys=>page.evaluate(keys=>{for(const k of keys)document.dispatchEvent(new KeyboardEvent('keydown',{key:k,repeat:true,bubbles:true}));},keys);
      await held([' ','Enter','y','n']);
      assert.equal(await page.locator('#quizAnswerBox').isVisible(),false,'Held keys do not reveal');
      await page.keyboard.press('Space');
      assert.equal(await page.locator('#quizAnswerBox').isVisible(),true);
      await held([' ','y','n','ArrowRight','ArrowLeft']);
      assert.equal(await page.evaluate(()=>STATE.quiz.answers.length),0,'Held keys do not judge');
      await page.keyboard.press('n');await page.keyboard.press('y');await page.keyboard.press('n');
      assert.deepEqual(await page.evaluate(()=>STATE.quiz.answers.map(a=>a.correct)),[false],'Mashing keeps the first judgement');
      await held(['Enter','y','n']);
      await page.waitForFunction(()=>!document.getElementById('btnQuizNext').disabled);
      await held(['Enter']);
      assert.equal(await page.evaluate(()=>STATE.quiz.index),0,'Held Enter never advances');
      await page.locator('#quizSourceLink').dispatchEvent('keydown',{key:'Enter',bubbles:true});
      assert.equal(await page.evaluate(()=>STATE.quiz.index),0,'Enter on a focused link does not skip the card');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>STATE.quiz.index),1);
      await page.keyboard.press('Space');await page.keyboard.press('y');
      assert.deepEqual(await page.evaluate(()=>STATE.quiz.answers.map(a=>a.correct)),[false,true]);
      // Quitting while a save is in flight keeps the quiz; the failed save is retried and stored once.
      const savesBefore=quizSaves;let slowRelease;
      await page.route('**/api/quiz/answers',async route=>{await new Promise(r=>{slowRelease=r;});route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'slow failure'})});},{times:1});
      let quitDialogs=0;page.on('dialog',d=>{quitDialogs++;d.dismiss();});
      await page.locator('#btnQuizNext').click();
      await page.waitForFunction(()=>STATE.quiz?.saving===true);
      assert.equal(await page.locator('#btnQuizNext').isDisabled(),true);
      assert.match(await page.locator('#quizNextLabel').textContent(),/保存中/);
      await page.locator('#btnQuizQuit').click();
      assert.equal(quitDialogs,0,'No dialog while saving');
      assert.equal(await page.evaluate(()=>STATE.quiz!==null && !document.getElementById('quizRunCard').hidden),true,'Quiz survives quit during save');
      slowRelease();
      await page.waitForFunction(()=>STATE.quiz && !STATE.quiz.saving);
      assert.deepEqual(await page.evaluate(()=>STATE.quiz.answers.map(a=>a.correct)),[false,true],'Unsaved answers kept after the failure');
      await page.locator('#btnQuizNext').click();
      await page.waitForFunction(()=>STATE.quiz===null);
      assert.equal(quizSaves-savesBefore,2,'One failed attempt plus exactly one retry');
      await page.close();
      console.log('Chromium learning flow passed at '+width+'px');
    }
  } finally {await browser.close();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
