// Code-only front-end regression tests. These do not replace browser dialog/device tests.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function harness(){
 const nodes=new Map(),responses=[];let accept=false,prompts=0;
 const el=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',textContent:'',hidden:true,disabled:false,listeners:{},children:[],appendChild(n){this.children.push(n)},classList:{add(){},remove(){},toggle(){}},addEventListener(e,fn){this.listeners[e]=fn},scrollIntoView(){},focus(){},replaceChildren(){this.children=[]},closest(){return el(this.id+'-parent')}});return nodes.get(id);};
 let created=0;
 const ctx=vm.createContext({document:{addEventListener(){},createElement(){return el('created-'+(++created));},getElementById:el,querySelector(s){return s.includes('eval-row')?el('eval-row'):null},querySelectorAll(s){return s.includes('data-nw-')?responses:[];}},window:{scrollTo(){}},URLSearchParams,console,setTimeout,clearTimeout,setInterval,clearInterval,localStorage:{getItem(){return null},setItem(){}},confirm(){prompts++;return accept;}});
 vm.runInContext(fs.readFileSync('public/app.js','utf8'),ctx);
 vm.runInContext(`switchTab=name=>{STATE.activeTab=name};startTimer=()=>{STATE.timer.isRunning=true};stopTimer=()=>{STATE.timer.isRunning=false};updateCharCount=()=>{};setupPills=()=>{};showToast=()=>{};
 mountNetworkExercise=quest=>{STATE.nwChoice=null;document.querySelectorAll('[data-nw-answer]').forEach(i=>i.value='');};
 renderHeroQuest({title:'Report recommendation',category:'ai',type:'report',reason:'r',criteria:'c'},'rule','');initRunMode();`,ctx);
 return {ctx,el,responses,run:code=>vm.runInContext(code,ctx),setAccept:value=>{accept=value},prompts:()=>prompts};
}
const first={title:'2025 pm2 Q1',sourceLabel:'NW',kind:'written',itemId:'exam:nw-07_haru-pm2-1',minutes:120};
const second={...first,title:'2025 pm2 Q2',itemId:'exam:nw-07_haru-pm2-2'};
(async()=>{
 const h=harness();h.ctx.first=first;h.ctx.second=second;h.run('startNetworkQuestion(first)');
 h.responses.push({value:'Long answer stays here'});h.run("STATE.nwChoice='ア'");
 h.el('btnCancelRun').listeners.click();assert.equal(h.el('questRunCard').hidden,false);assert.equal(h.responses[0].value,'Long answer stays here');assert(h.run('STATE.timer.isRunning'));
 h.setAccept(true);h.el('btnCancelRun').listeners.click();
 assert.equal(h.el('questRunCard').hidden,true);assert.equal(h.el('heroTitle').textContent,h.run('STATE.currentQuest.title'));assert.equal(h.el('heroTitle').textContent,'NW '+first.title);assert.equal(h.run('STATE.timer.isRunning'),false);
 h.run('startQuestRun(STATE.currentQuest)');assert.equal(h.el('runTitle').textContent,h.el('heroTitle').textContent);assert.equal(h.responses[0].value,'');
 h.responses[0].value='Unsaved written response';h.run("STATE.activeTab='library'");h.setAccept(false);let count=h.prompts();
 h.run('startNetworkQuestion(second)');assert.equal(h.prompts(),count+1);assert.equal(h.run('STATE.currentQuest.itemId'),first.itemId);assert.equal(h.responses[0].value,'Unsaved written response');assert.equal(h.run('STATE.activeTab'),'quest');assert.equal(h.el('questRunCard').hidden,false);
 h.setAccept(true);h.run('startNetworkQuestion(second)');assert.equal(h.run('STATE.currentQuest.itemId'),second.itemId);assert.equal(h.responses[0].value,'');
 // A recommendation response may also replace a hidden running exercise.
 h.responses[0].value='Do not discard via recommendation';h.setAccept(false);
 h.ctx.reply={quest:{title:'New report',category:'ai',type:'report'},allCandidates:[]};h.run('api=async()=>reply');
 await h.run('loadRecommendedQuest()');assert.equal(h.run('STATE.currentQuest.itemId'),second.itemId);assert.equal(h.responses[0].value,'Do not discard via recommendation');assert.equal(h.el('questRunCard').hidden,false);
 // Starting a quiz from the library must protect the same answer fields.
 h.run("api=async()=>({cards:[{id:'test-card'}]})");count=h.prompts();await h.run("startQuizRun({title:'AP quiz',type:'一問一答'})");assert.equal(h.prompts(),count+1);assert.equal(h.responses[0].value,'Do not discard via recommendation');assert.equal(h.run('STATE.currentQuest.itemId'),second.itemId);
 // Selecting another hero candidate also cannot silently discard a response.
 h.ctx.candidate={id:'report',title:'Selected report',category:'ai',type:'report'};
 h.run('STATE.allCandidates=[candidate];openCandidatesModal()');count=h.prompts();
 h.el('questListBody').children[0].listeners.click();assert.equal(h.prompts(),count+1);assert.equal(h.responses[0].value,'Do not discard via recommendation');assert.equal(h.run('STATE.currentQuest.itemId'),second.itemId);
 // A late recommendation started before a selected exercise cannot replace it.
 const race=harness();race.ctx.first=first;let release;race.ctx.apiReply=()=>new Promise(resolve=>{release=resolve;});race.run('api=apiReply');let pending=race.run('loadRecommendedQuest()');race.run('startNetworkQuestion(first)');release({quest:{title:'Late report',category:'ai'}});await pending;assert.equal(race.run('STATE.currentQuest.itemId'),first.itemId);assert.equal(race.el('questRunCard').hidden,false);
 // An older NW content load cannot clear a newly started exercise.
 const mounted=harness();mounted.ctx.first={...first,category: 'nw'};
 mounted.run("STATE.currentQuest=first;document.getElementById('questRunCard').hidden=false");
 vm.runInContext(fs.readFileSync('public/nw-exercise.js','utf8'),mounted.ctx);
 let releaseContent;mounted.ctx.loadContent=()=>new Promise(resolve=>{releaseContent=resolve});mounted.run('api=loadContent');
 const staleMount=mounted.run('mountNetworkExercise(first)');
 mounted.run("STATE.currentQuest={category:'ai'};mountNetworkExercise(STATE.currentQuest)");
 releaseContent({network:[]});await staleMount;assert.equal(mounted.run('STATE.nwQuestion'),null);assert.equal(mounted.el('nwExercise').hidden,true);
 // Saving cannot be interrupted, even by a confirmed switch.
 h.el('btnCompleteQuest').disabled=true;h.setAccept(true);count=h.prompts();h.run('startNetworkQuestion(first)');assert.equal(h.prompts(),count);assert.equal(h.run('STATE.currentQuest.itemId'),second.itemId);
 console.log('Front-end VM: cancel/restart hero identity, protected NW/quiz/recommendation switches, late responses and in-flight save passed. Native confirm and SE3 remain browser checks.');
})().catch(e=>{console.error(e);process.exitCode=1;});


