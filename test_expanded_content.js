const assert=require('node:assert/strict');
const {AWS_COURSES,GCP_COURSES,CLAUDE_COURSES,QUIZ_CARDS}=require('./lib/content');
const {buildDeck,applyAnswers,quizStats,MAX_DECK_SIZE}=require('./lib/quiz');
const courses=[...AWS_COURSES,...GCP_COURSES,...CLAUDE_COURSES];
assert.equal(MAX_DECK_SIZE,100);
assert.equal(courses.length,9);
assert.equal(new Set(QUIZ_CARDS.map(c=>c.id)).size,QUIZ_CARDS.length);
for(const course of courses){
 const cards=QUIZ_CARDS.filter(c=>c.exam===course.exam);
 assert.equal(cards.length,100,course.exam+' size');
 assert.equal(new Set(cards.map(c=>c.question.normalize('NFKC').replace(/\s/g,''))).size,100,course.exam+' duplicate question');
 for(const card of cards){
  assert(card.answer.trim()&&card.explanation.trim()&&card.checkedAt&&card.sources.length,card.id);
  for(const source of card.sources){const url=new URL(source);assert.equal(url.protocol,'https:');assert(/(^|\.)(amazon\.com|google\.com|google\.dev|claude\.com|anthropic\.com|modelcontextprotocol\.io|amazonaws\.com)$/.test(url.hostname),card.id+' official source');}
  if(card.distractors)assert.equal(new Set([card.answer,...card.distractors]).size,4);
 }
 for(const domain of course.domains)assert(cards.filter(c=>c.domain===domain.id).length>=4,course.exam+'/'+domain.id+' coverage');
 const store={quizProgress:{}};
 for(const mode of ['new','practice','mix']){
  const deck=buildDeck(store,{exam:course.exam,count:100,mode});
  assert.equal(deck.length,100);assert.equal(new Set(deck.map(c=>c.id)).size,100);
 }
 const deck=buildDeck(store,{exam:course.exam,count:100,format:'choice',mode:'practice'});
 for(const card of deck){assert(card.choices.includes(card.answer));assert.equal(new Set(card.choices).size,4);}
 applyAnswers(store,deck.map(c=>({id:c.id,correct:true})));
 assert.equal(Object.keys(store.quizProgress).length,100);
 assert.equal(buildDeck(store,{exam:course.exam,count:100,mode:'practice'}).length,100);
 const counts=Object.fromEntries(course.domains.map(d=>[d.id,cards.filter(c=>c.domain===d.id).length]));
 console.log(course.exam+': 100 unique cards; domains '+JSON.stringify(counts));
}
console.log('Nine courses: sources, coverage, 100-card decks, choices, saved progress and restart passed.');

// Retired IDs remain reserved: old progress must never attach to a new question.
const retired=['aws-saa-d1-06','aws-saa-d3-01','aws-saa-d3-03','aws-saa-d4-06','aws-saa-d4-07','aws-saa-d1-08','aws-sap-d1-08','aws-sap-d3-03'];
const legacy={quizProgress:Object.fromEntries(retired.map(id=>[id,{box:5,correct:9,wrong:1,last:'2025-01-01T00:00:00Z',due:'2025-01-02T00:00:00Z'}])),quizReports:[{cardId:'aws-sap-d1-08',note:'saved historical report'}]};
const snapshot=structuredClone(legacy);
for(const id of retired)assert(!QUIZ_CARDS.some(c=>c.id===id),'Reserved historical ID reused: '+id);
assert.equal(quizStats(legacy).aws.studied,0);
const fresh=buildDeck(legacy,{exam:'aws-sap',count:100,mode:'new'});
assert.equal(fresh.length,100);assert(!fresh.some(c=>retired.includes(c.id)));
assert.deepEqual(applyAnswers(legacy,retired.map(id=>({id,correct:true}))),[]);
assert.deepEqual(legacy,snapshot,'Orphaned history and reports must be preserved unchanged');
applyAnswers(legacy,[{id:'aws-sap-d1-27',correct:true}]);
assert.equal(legacy.quizProgress['aws-sap-d1-27'].correct,1);
assert.deepEqual(legacy.quizProgress['aws-sap-d1-08'],snapshot.quizProgress['aws-sap-d1-08']);
console.log('Retired IDs: no history reassignment, no false mastery, saved reports preserved.');
