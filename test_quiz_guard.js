// Code-only regression for the quiz self-judge guards. A controllable clock and timer queue make the
// 600ms boundary exact; real-browser timing, focus and layout stay with test_learning_ui.js.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function harness(){
  const answersQueue=[],nodes=new Map(),timers=[],toasts=[],apiCalls=[];let clock=1_000_000,prompts=0,keydown=null,apiImpl=async()=>({});
  class FakeDate extends Date{static now(){return clock;}}
  const el=id=>{if(!nodes.has(id)){const e={id,value:'',textContent:'',innerHTML:'',hidden:true,disabled:false,listeners:{},style:{},dataset:{},attrs:{},classes:new Set(),
    classList:{add:c=>e.classes.add(c),remove:c=>e.classes.delete(c),toggle:(c,on)=>{(on===undefined?!e.classes.has(c):on)?e.classes.add(c):e.classes.delete(c);}},
    setAttribute(k,v){e.attrs[k]=String(v);},removeAttribute(k){delete e.attrs[k];},getAttribute(k){return e.attrs[k]??null;},
    addEventListener(t,fn){e.listeners[t]=fn;},focus(){},scrollIntoView(){},add(){},replaceChildren(){},append(){},closest(){return null;}};nodes.set(id,e);}return nodes.get(id);};
  class Element{}
  const target=closest=>Object.assign(new Element(),{closest});
  const ctx=vm.createContext({Date:FakeDate,Element,Option:function(){},URLSearchParams,console,
    setTimeout:(fn,ms)=>{const t={fn,at:clock+ms};timers.push(t);return t;},clearTimeout:t=>{const i=timers.indexOf(t);if(i>=0)timers.splice(i,1);},setInterval(){},clearInterval(){},
    localStorage:{getItem(){return null},setItem(){}},confirm(){prompts++;return answersQueue.length?answersQueue.shift():false;},window:{scrollTo(){}},
    document:{addEventListener(t,fn){if(t==='keydown')keydown=fn;},getElementById:el,querySelector:sel=>el('qs:'+sel),querySelectorAll:()=>[],createElement:()=>el('created')}});
  vm.runInContext(fs.readFileSync('public/app.js','utf8'),ctx);
  const run=code=>vm.runInContext(code,ctx);
  ctx.__api=(path,opts)=>{apiCalls.push(path);return apiImpl(path,opts);};
  ctx.__toast=m=>toasts.push(m);
  run('api=__api;showToast=__toast;updateReviewBadge=()=>{};initQuiz()');
  const cards=n=>Array.from({length:n},(_,i)=>({id:'c'+i,question:'Q'+i,answer:'A'+i,explanation:'',url:'https://example.com',sourceLabel:'S',topic:'T',field:'F'}));
  return {ctx,el,run,target,confirms:answersQueue,toasts,apiCalls,prompts:()=>prompts,
    setApi:fn=>{apiImpl=fn;},
    advance:ms=>{clock+=ms;for(const t of timers.filter(t=>t.at<=clock)){timers.splice(timers.indexOf(t),1);t.fn();}},
    start:n=>{ctx.__cards=cards(n);run("STATE.quiz={quest:{title:'t',reason:'r',criteria:'c',decisionSource:'manual'},cards:__cards,index:0,answers:[],startedAt:Date.now(),saving:false,format:'self',confidence:null};setHidden('quizRunCard',false);renderQuizCard()");},
    key:(key,o={})=>{const ev={key,repeat:false,ctrlKey:false,metaKey:false,altKey:false,target:target(()=>null),prevented:false,preventDefault(){ev.prevented=true;},...o};keydown(ev);return ev;}};
}
const idx=h=>h.run('STATE.quiz.index'),answers=h=>JSON.parse(h.run('JSON.stringify(STATE.quiz.answers.map(a=>a.correct))'));
(async()=>{
  // 1. Guard boundary on a controlled clock: nothing advances before 600ms, everything works at 600ms.
  let h=harness();h.start(3);
  h.key(' ');assert.equal(h.el('quizAnswerBox').hidden,false);assert.deepEqual(answers(h),[],'Revealing alone records nothing');
  h.key('y');assert.deepEqual(answers(h),[true]);
  const next=h.el('btnQuizNext');
  assert.equal(next.disabled,true,'Next is visibly disabled right after judging');assert.match(h.el('quizNextLabel').textContent,/反映中/);
  next.listeners.click();h.key('Enter');assert.equal(idx(h),0,'Click/Enter inside the window do not advance');
  h.advance(599);assert.equal(next.disabled,true);h.key('Enter');next.listeners.click();assert.equal(idx(h),0,'599ms: still guarded');
  h.advance(1);assert.equal(next.disabled,true,'600ms: timer has not fired yet (+20ms settle)');
  h.advance(20);assert.equal(next.disabled,false);assert.equal(h.el('quizNextLabel').textContent,'次へ');
  h.key('Enter');assert.equal(idx(h),1,'After the window Enter advances exactly one card');
  assert.equal(h.el('btnQuizRight').disabled,false,'The next card re-enables the judge buttons');

  // 2. Space / Y / N with repeat:true (held keys) never reveal, judge or advance.
  h=harness();h.start(2);
  for(const k of [' ','Enter','y','n','ArrowRight','ArrowLeft'])h.key(k,{repeat:true});
  assert.equal(h.el('quizAnswerBox').hidden,true,'Held keys before reveal do nothing');assert.deepEqual(answers(h),[]);
  h.key(' ');for(const k of [' ','y','Y','n','N','ArrowRight','ArrowLeft'])h.key(k,{repeat:true});
  assert.deepEqual(answers(h),[],'Held keys after reveal do not judge');
  h.key('n');assert.deepEqual(answers(h),[false]);
  for(const k of ['n','y','N','Y','ArrowRight','ArrowLeft'])h.key(k);          // mashing after judging
  for(const k of ['n','y','Enter'])h.key(k,{repeat:true});
  assert.deepEqual(answers(h),[false],'Mashing or holding after judging keeps the first judgement');assert.equal(idx(h),0);
  h.advance(700);
  h.key('Enter',{repeat:true});assert.equal(idx(h),0,'Held Enter never advances');
  h.key('Enter');assert.equal(idx(h),1);
  h.key(' ');h.key('Y');assert.deepEqual(answers(h),[false,true],'Y and N both judge on a fresh card, once each');

  // 3. Focused links/buttons keep Enter/Space; typing in a field is untouched.
  h=harness();h.start(2);
  const onLink=h.target(sel=>/a\[href\]/.test(sel)?{}:null),onField=h.target(sel=>/input, textarea, select/.test(sel)?{}:null);
  let ev=h.key('Enter',{target:onLink});assert.equal(h.el('quizAnswerBox').hidden,true,'Enter on a focused link does not reveal');assert.equal(ev.prevented,false);
  ev=h.key(' ',{target:onLink});assert.equal(h.el('quizAnswerBox').hidden,true);assert.equal(ev.prevented,false);
  h.key(' ',{target:onField});assert.equal(h.el('quizAnswerBox').hidden,true);
  h.key(' ');h.key('y');h.advance(700);
  ev=h.key('Enter',{target:onLink});assert.equal(idx(h),0,'Enter on a focused link does not skip the card');assert.equal(ev.prevented,false);
  h.key('Enter');assert.equal(idx(h),1);

  // 4. Quit while saving keeps state; a failed save is retryable and saved exactly once.
  h=harness();h.start(1);
  let release;h.setApi((path)=>path==='/api/quiz/answers'?new Promise(r=>{release=r;}):Promise.resolve({}));
  h.key(' ');h.key('n');h.advance(700);
  const firstSave=h.run('goNextQuizCard()');   // finishQuiz is async; keep going while pending
  assert.equal(h.run('STATE.quiz.saving'),true);assert.equal(h.el('btnQuizNext').disabled,true);assert.equal(h.el('quizNextLabel').textContent,'保存中…');
  h.run('goNextQuizCard()');h.key('Enter');h.run('judgeQuizCard(true)');
  assert.equal(h.apiCalls.filter(p=>p==='/api/quiz/answers').length,1,'No second save while one is in flight');
  const before=h.prompts();await h.run('quitQuiz()');
  assert.equal(h.prompts(),before,'No confirm dialog while saving');assert.notEqual(h.run('STATE.quiz'),null,'Quiz state survives quitting during a save');
  assert.equal(h.el('quizRunCard').hidden,false);assert.deepEqual(answers(h),[false]);assert(h.toasts.some(m=>/保存中/.test(m)));
  release({success:false,error:'forced failure'});await new Promise(r=>setImmediate(r));
  assert.notEqual(h.run('STATE.quiz'),null,'A failed save keeps the quiz');assert.equal(h.run('STATE.quiz.saving'),false);
  assert.equal(h.run('STATE.quiz.index'),0,'Index realigned to the visible last card');assert.deepEqual(answers(h),[false],'Unsaved answers are kept');
  assert(h.toasts.some(m=>/forced failure/.test(m)&&/再送/.test(m)));
  assert.equal(h.el('btnQuizNext').disabled,false,'Retry is available');assert.equal(h.el('quizNextLabel').textContent,'次へ');
  h.setApi(async(path)=>path==='/api/quiz/answers'?{success:true,summary:'ok',evaluation:{},wrongCards:[],stats:{}}:{});
  h.key('Enter');await new Promise(r=>setImmediate(r));
  assert.equal(h.apiCalls.filter(p=>p==='/api/quiz/answers').length,2,'Exactly one retry after the failure');
  assert.equal(h.run('STATE.quiz'),null,'Successful retry completes the quiz');
  h.key('Enter');await new Promise(r=>setImmediate(r));
  assert.equal(h.apiCalls.filter(p=>p==='/api/quiz/answers').length,2,'Nothing re-sends once the quiz is finished');
  await firstSave;

  // 5. Cancelling the quit dialog keeps the quiz and its unsaved answers; discarding is a separate, explicit confirmation.
  h=harness();h.start(2);h.key(' ');h.key('y');
  h.confirms.push(false,false);await h.run('quitQuiz()');
  assert.equal(h.prompts(),2,'Cancel asks once more whether to discard');assert.notEqual(h.run('STATE.quiz'),null,'Cancelling both keeps the quiz');
  assert.deepEqual(answers(h),[true]);assert.equal(h.el('quizRunCard').hidden,false);
  h.confirms.push(false,true);await h.run('quitQuiz()');
  assert.equal(h.run('STATE.quiz'),null,'Confirming the discard abandons the unsaved quiz');
  // ...and after a failed save the answers survive a cancelled quit, so the save can still be retried.
  h=harness();h.start(1);h.setApi(async p=>p==='/api/quiz/answers'?{success:false,error:'boom'}:{});
  h.key(' ');h.key('n');h.advance(700);h.key('Enter');await new Promise(r=>setImmediate(r));
  h.confirms.push(false,false);await h.run('quitQuiz()');
  assert.notEqual(h.run('STATE.quiz'),null);assert.deepEqual(answers(h),[false]);
  h.setApi(async p=>p==='/api/quiz/answers'?{success:true,summary:'ok',evaluation:{},wrongCards:[],stats:{}}:{});
  h.key('Enter');await new Promise(r=>setImmediate(r));
  assert.equal(h.run('STATE.quiz'),null,'Retry after a cancelled quit succeeds');
  // 6. オフライン: AWS はオフライン用の保存の対象外。「問題がない」「弱点がない」と誤表示せず、接続が必要と伝える。オンラインに戻れば出題できる
  const WRONG_MESSAGES = /弱点分野はまだありません|出題できる問題がありません|オフライン用の問題がありません|復習期限が来た問題はありません/;
  for (const quiz of [{ exam: 'aws-saa', mode: 'weak', count: 10 }, { exam: 'aws-clf', mode: 'review', count: 10 }, { exam: 'aws', mode: 'mix', count: 10 }]) {
    h = harness();h.run('switchTab=()=>{}');h.run('STATE.offline=true');
    h.ctx.__quiz = quiz;
    await h.run("startQuizRun({ type: '一問一答', category: 'aws', title: 'AWS offline', quiz: __quiz })");
    assert.equal(h.run('STATE.quiz'), null, `${quiz.exam}/${quiz.mode}: オフラインでは始めない`);
    assert(h.toasts.some(m => /AWSの問題はオフラインでは使えません/.test(m) && /オンライン/.test(m)), 'オンライン接続が必要と伝える');
    assert(!h.toasts.some(m => WRONG_MESSAGES.test(m)), `${quiz.exam}/${quiz.mode}: 「問題がない」「弱点がない」と誤表示しない`);
    assert.equal(h.apiCalls.length, 0, 'オフライン中はAPIを呼ばない');
  }
  // 通信に失敗してオフラインへ切り替わった場合も同じ（保存した問題での続行や誤表示をしない）
  h = harness();h.run('switchTab=()=>{}');h.run('STATE.offline=false');
  h.setApi(async () => { throw new Error('network down'); });
  h.ctx.__quiz = { exam: 'aws-saa', mode: 'weak', count: 10 };
  await h.run("startQuizRun({ type: '一問一答', category: 'aws', title: 'AWS net down', quiz: __quiz })");
  assert.equal(h.run('STATE.quiz'), null);
  assert.equal(h.run('STATE.offline'), true, '通信失敗でオフライン状態になる');
  assert(h.toasts.some(m => /AWSの問題はオフラインでは使えません/.test(m)));
  assert(!h.toasts.some(m => WRONG_MESSAGES.test(m)));
  // オンラインに戻ったら、同じ操作で出題できる
  h.run('STATE.offline=false');
  h.setApi(async path => path.startsWith('/api/quiz/deck') ? { cards: JSON.parse(JSON.stringify(h.ctx.__cards || [])) } : {});
  h.ctx.__cards = Array.from({ length: 2 }, (_, i) => ({ id: `aws-saa-d1-0${i + 1}`, family: 'aws', question: `Q${i}`, answer: `A${i}`, explanation: 'e', url: 'https://docs.aws.amazon.com/', sources: ['https://docs.aws.amazon.com/'], sourceKind: 'docs', checkedAt: '2026-10-22', sourceLabel: 'S', topic: 'T', field: 'F' }));
  await h.run("startQuizRun({ type: '一問一答', category: 'aws', title: 'AWS back online', quiz: __quiz })");
  assert.notEqual(h.run('STATE.quiz'), null, 'オンラインに戻れば出題できる');
  assert.equal(h.run('STATE.quiz.cards.length'), 2);
  assert(h.apiCalls.some(p => p.startsWith('/api/quiz/deck')));
  // IPA のオフライン動作（保存した問題）は変えない: AWS 以外は従来の案内のまま
  h = harness();h.run('switchTab=()=>{}');h.run('STATE.offline=true');
  h.ctx.__quiz = { exam: 'all', mode: 'mix', count: 10 };
  await h.run("startQuizRun({ type: '一問一答', category: 'sc', title: 'IPA offline', quiz: __quiz })");
  assert(h.toasts.some(m => /オフライン用の問題がありません/.test(m)), 'IPAは従来の案内');
  assert(!h.toasts.some(m => /AWSの問題はオフラインでは使えません/.test(m)));

  console.log('Quiz guard VM tests passed: 600ms boundary on a controlled clock, repeat keys, focused controls, quit/retry while saving, AWS offline guidance and recovery.');
})().catch(e=>{console.error(e);process.exitCode=1;});
