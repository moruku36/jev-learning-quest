// 追加した基礎AI・GCPコースのデータ、API、進捗の回帰確認。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createApp } = require('./lib/app');
const { createFileStorage } = require('./lib/storage-file');
const { AWS_COURSES, GCP_COURSES, AWS_CARDS, GCP_CARDS, QUIZ_CARD_MAP } = require('./lib/content');
const { quizStats } = require('./lib/quiz');

assert.deepEqual(AWS_COURSES.map(c => c.id), ['aif','clf','saa','sap']);
assert.deepEqual(GCP_COURSES.map(c => c.id), ['gai','cdl','ace','pca']);
assert.deepEqual(GCP_COURSES.map(c => c.rows.length), [30,30,30,30]);
assert.equal(AWS_CARDS.filter(c => c.course === 'aif').length, 35);
assert.equal(GCP_CARDS.length, 120);
assert.equal([...QUIZ_CARD_MAP.values()].filter(c => c.family !== 'claude').length, 1308);
assert.deepEqual(GCP_COURSES.map(c => c.domains.reduce((n,d) => n+d.weight,0)), [100,100,100,100]);
for (const course of [...GCP_COURSES, AWS_COURSES[0]]) {
  const cards = (course.exam.startsWith('gcp-') ? GCP_CARDS : AWS_CARDS).filter(c => c.exam === course.exam);
  assert(cards.length >= 30);
  assert(cards.every(c => c.question && c.answer && c.explanation && c.url && c.checkedAt && !c.choices));
  assert(cards.every(c => course.domains.some(d => d.id === c.domain) && c.group === `${course.exam}-${c.domain}`));
  assert(course.domains.every(d => cards.some(c => c.domain === d.id)));
  assert.equal(new Set(cards.map(c => c.question)).size, cards.length);
  assert(cards.every(c => c.answer.length <= 160));
  assert(cards.every(c => c.sources.every(u => /^https:\/\/(services\.google\.com|docs\.aws\.amazon\.com|aws\.amazon\.com)\//.test(u))));
}
assert.equal(quizStats({quizProgress:{}}).all.total,1050,'IPA問題数は変わらない');
assert.equal(quizStats({quizProgress:{}}).aws.total,138);
assert.equal(quizStats({quizProgress:{}}).gcp.total,120);

const html = fs.readFileSync(path.join(__dirname,'public/index.html'),'utf8');
for (const [pill, values] of [
  ['awsCoursePills',['aif','clf','saa','sap']],
  ['gcpCoursePills',['gai','cdl','ace','pca']]
]) {
  const area = new RegExp(`id="${pill}">([\\s\\S]*?)<\\/div>`).exec(html)?.[1];
  assert(area, pill);
  let last = -1;
  for (const value of values) { const at = area.indexOf(`data-val="${value}"`); assert(at > last, `${pill}: ${value} 順序`); last = at; }
}
assert(/id="catPills">[\s\S]*?data-val="gcp"/.test(html));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'cloud-courses-'));
  const storage = createFileStorage(dir);
  const server = http.createServer(createApp({mode:'local',storage,publicDir:path.join(__dirname,'public')}));
  await new Promise(r => server.listen(0,'127.0.0.1',r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (route,body) => {
    const r = await fetch(base+route,body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : undefined);
    return {status:r.status,data:await r.json()};
  };
  try {
    const content = (await call('/api/content')).data;
    assert.deepEqual(content.gcp.courses.map(c => c.id),['gai','cdl','ace','pca']);
    assert.equal(content.gcp.stats.total,120);
    assert.equal(content.aws.stats.total,138);
    assert.equal(content.quiz.stats.all.total,1050);
    for (const exam of ['aws-aif',...GCP_COURSES.map(c => c.exam)]) {
      const deck = (await call(`/api/quiz/deck?exam=${exam}&count=10`)).data.cards;
      assert.equal(deck.length,10);
      assert(deck.every(c => c.exam === exam && c.question && c.answer && c.explanation));
      const choices = (await call(`/api/quiz/deck?exam=${exam}&count=5&format=choice`)).data.cards;
      assert(choices.every(c => c.choices.length === 4 && new Set(c.choices).size === 4 && c.choices.includes(c.answer)));
    }
    assert(new Set((await call('/api/quiz/deck?exam=gcp&count=30')).data.cards.map(c => c.exam)).size > 1);
    const card = (await call('/api/quiz/deck?exam=gcp-gai&count=1')).data.cards[0];
    const answer = await call('/api/quiz/answers',{answers:[{id:card.id,correct:false}],title:'GCP基礎AI',format:'self',decisionSource:'manual'});
    assert.equal(answer.status,201);
    assert.equal(answer.data.history.category,'gcp');
    assert.equal(answer.data.stats['gcp-gai'].studied,1);
    assert.equal(answer.data.stats.aws.studied,0);
    assert.equal(answer.data.stats.all.studied,0);
    const history = (await call('/api/history')).data;
    assert.equal(history.gcpCourseStats.gai.studied,1);
    assert.equal(history.courseStats.aif.studied,0);
    const saved = await storage.load(null);
    assert.equal(saved.quizProgress[card.id].wrong,1);
    saved.quizProgress[card.id].due = '2020-01-01T00:00:00.000Z';
    await storage.save(null,saved);
    const review = (await call('/api/quiz/deck?exam=gcp-gai&mode=review&count=10')).data.cards;
    assert.deepEqual(review.map(c => c.id),[card.id]);
    assert.equal((await call('/api/quiz/deck?exam=aws-aif&mode=review&count=10')).data.cards.length,0);
    assert.equal((await call('/api/quest/recommend',{minutes:20,category:'gcp',gcpCourse:'gai',goal:'balance'})).data.allCandidates.every(c => c.category === 'gcp'),true);
    console.log('Cloud courses: counts, IDs, domain mapping, order, deck, history and isolated progress passed.');
  } finally { await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode=1; });
