// Keep the official pixels; zoom inside the page without opening another tab.
function createNetworkImageViewer(images, pages, label) {
  const viewer=document.createElement('section');viewer.className='nw-viewer';
  const toolbar=document.createElement('div');toolbar.className='nw-pager';
  const viewport=document.createElement('div');viewport.className='nw-image-box';viewport.tabIndex=0;
  viewport.setAttribute('aria-label',label+'。拡大時は左右上下にスクロールできます');
  const img=document.createElement('img');img.className='nw-original';viewport.append(img);
  let page=0,scale=100;
  function button(text,action) {
    const b=document.createElement('button');b.type='button';b.className='btn btn-outline';b.textContent=text;b.onclick=action;toolbar.append(b);return b;
  }
  const previous=button('前のページ',()=>{page--;show();});
  const counter=document.createElement('span');counter.setAttribute('role','status');toolbar.append(counter);
  const next=button('次のページ',()=>{page++;show();});
  const smaller=button('縮小 −',()=>{scale=Math.max(100,scale-50);show(false);});
  const larger=button('拡大 ＋',()=>{scale=Math.min(300,scale+50);show(false);});
  button('幅に合わせる',()=>{scale=100;show(false);viewport.scrollLeft=viewport.scrollTop=0;});
  const original=document.createElement('a');original.className='run-link';original.target='_blank';original.rel='noopener noreferrer';original.textContent='原寸で開く ↗';toolbar.append(original);
  function show(reset=true) {
    img.src=images[page];img.alt=label+'（PDF '+pages[page]+'ページ）';
    img.style.width=scale+'%';original.href=images[page];
    counter.textContent=(page+1)+' / '+images.length+' · '+scale+'%';
    previous.disabled=page===0;next.disabled=page===images.length-1;
    previous.hidden=next.hidden=images.length<2;smaller.disabled=scale===100;larger.disabled=scale===300;
    if(reset)viewport.scrollLeft=viewport.scrollTop=0;
  }
  const fallback=document.createElement('p');fallback.className='field-hint';fallback.hidden=true;
  fallback.textContent='画像を読み込めませんでした。「原寸で開く」か上のIPA問題冊子リンクで確認してください。';
  img.onerror=()=>{fallback.hidden=false;};
  img.onload=()=>{fallback.hidden=true;};
  viewer.append(toolbar,viewport,fallback);show();return viewer;
}
// Official scanned content, morning key grading and afternoon self-assessment.
let nwMountGeneration=0;
async function mountNetworkExercise(quest) {
  const generation=++nwMountGeneration;
  const host=document.getElementById('nwExercise');
  host.onkeydown=null;host.replaceChildren(); host.hidden=quest.category!=='nw';
  const isNW=quest.category==='nw';
  STATE.nwQuestion=null;
  document.getElementById('inputAnswer').closest('.run-input-group').hidden=isNW;
  document.querySelector('#questRunCard .eval-row').hidden=isNW;
  const steps=isNW?['画面内の原本を読む', '午前は選択回答、午後は設問ごとに答案を書く', '午前は自動採点、午後は公式解答例で自己採点して保存']:['下の設問・作業内容を読む（解説はまだ見せません）','答案やメモを書く','自己採点して保存 → Jev が理解度と復習の要否を判断'];
  document.querySelectorAll('#questRunCard .run-steps li').forEach((li,i)=>li.textContent=steps[i]);
  if(!isNW)return;
  document.getElementById('writtenExtra').hidden=true;
  STATE.nwQuestion=null;STATE.nwChoice=null;
  host.textContent='原本画像を読み込んでいます…';
  let q=quest.networkQuestion || STATE.library?.network?.find(q=>q.itemId===quest.itemId);
  if(!q){
    try{const library=await api('/api/content');if(generation!==nwMountGeneration || STATE.currentQuest!==quest || document.getElementById('questRunCard').hidden)return;STATE.library=library;q=library.network.find(q=>q.itemId===quest.itemId);}
    catch{if(generation!==nwMountGeneration || STATE.currentQuest!==quest || document.getElementById('questRunCard').hidden)return;host.textContent='問題を読み込めませんでした。もう一度開始してください。';return;}
  }
  if(!q){host.textContent='問題データが見つかりません。';return;}
  STATE.nwQuestion=q;
  document.getElementById('runPrompt').textContent=`${q.sourceLabel}\n${q.kind==='choice'?'原本画像の選択肢から回答してください。':'原本の全設問に回答し、公式解答例を参照して自己採点してください。'}\n練習目安 ${q.minutes}分（${q.note}）`;
  document.getElementById('runLink').href=`${q.questionPdf}#page=${q.pdfPage}`;
  host.replaceChildren();
  const source=document.createElement('a');source.className='run-link';source.href=q.sourcePage;source.target='_blank';source.rel='noopener';source.textContent='この問題の出典・収録ページ・利用条件 ↗';host.append(source);
  const heading=document.createElement('h3');heading.textContent='設問 · IPA原本';host.append(heading);
  host.append(createNetworkImageViewer(q.images,q.pdfPages,q.sourceLabel+' 本文・選択肢・図表'));
  const hint=document.createElement('p');hint.className='field-hint';hint.textContent='拡大・縮小して読み、拡大中は画像をスクロールできます。原本の本文・図表をそのまま表示しています。';host.append(hint);
  if(q.kind==='choice'){
    const answerHeading=document.createElement('h3');answerHeading.textContent='回答';host.append(answerHeading);
    const choices=document.createElement('div');choices.className='pill-group nw-choice';choices.setAttribute('role','group');choices.setAttribute('aria-label','回答の選択肢。キーボード1〜4でア〜エ');
    for(const label of ['ア','イ','ウ','エ']){
      const button=document.createElement('button');button.type='button';button.className='pill';button.textContent=label;button.setAttribute('aria-pressed','false');
      button.onclick=()=>{STATE.nwChoice=label;for(const b of choices.children){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));}};choices.append(button);
    }
    const grade=document.createElement('button');grade.type='button';grade.className='btn btn-primary mt-8';grade.textContent='回答を採点する';
    const result=document.createElement('div');result.className='nw-feedback';result.hidden=true;result.tabIndex=-1;result.setAttribute('role','status');
    grade.onclick=()=>{
      if(!STATE.nwChoice){showToast('ア・イ・ウ・エから選んでください','warn');return;}
      STATE.nwGraded=true;setEvalState(STATE.nwChoice===q.correctChoice);grade.disabled=true;
      for(const b of choices.children)b.disabled=true;
      result.hidden=false;
      result.textContent=`${STATE.isCorrect?'正解':'不正解'} · あなたの回答: ${STATE.nwChoice} · 正解: ${q.correctChoice}（IPA公式）`;
      const explanation=document.createElement('p');explanation.className='field-hint';explanation.textContent='解説: この教材には公式正解表を収録しています。解説本文は未収録です。正解と原本を照らし合わせて覚え直してください。';result.append(explanation);
      result.focus({preventScroll:true});result.scrollIntoView({block:'nearest',behavior:'smooth'});
      const a=document.createElement('a');a.className='run-link';a.href=`${q.answerPdf}#page=1`;a.target='_blank';a.rel='noopener';a.textContent=' 公式正解表を確認 ↗';result.append(a);
    };
    host.append(choices,grade,result);
    host.onkeydown=e=>{
      if(STATE.nwGraded || e.repeat || e.ctrlKey || e.metaKey || e.altKey || !/^[1-4]$/.test(e.key))return;
      e.preventDefault();choices.children[Number(e.key)-1].click();grade.focus({preventScroll:true});
    };
    choices.children[0].focus({preventScroll:true});
  }else{
    const note=document.createElement('p');note.textContent='設問の本文・字数制限は上の原本画像にあります。各欄に回答し、公式解答例に照らして採点してください。';host.append(note);
    const reveal=document.createElement('button');reveal.type='button';reveal.className='btn btn-outline';reveal.textContent='公式解答例を表示する';
    const official=document.createElement('div');official.hidden=true;
    official.append(createNetworkImageViewer(q.answerImages,q.answerPages,q.sourceLabel+' 公式解答例'));
    reveal.onclick=()=>{official.hidden=!official.hidden;reveal.textContent=official.hidden?'公式解答例を表示する':'公式解答例を閉じる';};host.append(reveal,official);
    for(const section of q.sections){
      const group=document.createElement('fieldset');group.className='nw-section';const legend=document.createElement('legend');legend.textContent=`設問${section.no}`;group.append(legend);
      for(const sub of section.subquestions){
        const label=sub.no===null?`設問${section.no}`:`設問${section.no}(${sub.no})`;
        if(sub.invalid){const p=document.createElement('p');p.textContent=`${label}: 不備により設問不成立。採点対象外。`;group.append(p);continue;}
        const field=document.createElement('label');field.textContent=label;
        const answer=document.createElement('textarea');answer.className='simple-input';answer.rows=2;answer.maxLength=2000;answer.dataset.nwAnswer=sub.id;answer.setAttribute('aria-label',`${label}の答案`);field.append(answer);
        const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=`${label}の公式解答例・要点`;const text=document.createElement('pre');text.textContent=sub.answer;details.append(summary,text);
        const score=document.createElement('select');score.className='simple-input';score.dataset.nwScore=sub.id;score.setAttribute('aria-label',`${label}の自己採点`);
        for(const [value,text]of [['','自己採点を選ぶ'],['true','できた'],['false','できなかった']]){const option=document.createElement('option');option.value=value;option.textContent=text;score.append(option);}
        score.onchange=()=>setEvalState([...host.querySelectorAll('[data-nw-score]')].every(s=>s.value!=='false'));
        group.append(field,details,score);
      }
      host.append(group);
    }
  }
}
function prepareNetworkSubmission(){
  const q=STATE.nwQuestion;
  if(!q)throw Error('問題の読み込みが完了していません');
  if(q.kind==='choice'){
    if(!STATE.nwGraded)throw Error('選択肢を選んで、回答を採点してください');
    return {selectedChoice:STATE.nwChoice,userAnswer:`選択: ${STATE.nwChoice}`,isCorrect:STATE.nwChoice===q.correctChoice};
  }
  const answers=q.sections.flatMap(s=>s.subquestions).filter(s=>!s.invalid).map(s=>{
    const answer=document.querySelector(`[data-nw-answer="${s.id}"]`).value.trim();
    const score=document.querySelector(`[data-nw-score="${s.id}"]`).value;
    if(!answer||!score)throw Error(`設問${s.id.replace('-','(')+(s.id.includes('-')?')':'')}に回答・自己採点してください`);
    return {id:s.id,answer,isCorrect:score==='true'};
  });
  STATE.nwGraded=true;setEvalState(answers.every(a=>a.isCorrect));
  return {nwAnswers:answers,isCorrect:STATE.isCorrect,userAnswer:answers.map(a=>`設問${a.id}: ${a.answer}`).join('\n')};
}
