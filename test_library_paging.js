const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',disabled:false,hidden:false,value:'',focus(){this.focused=true}});return nodes.get(id);}
const sections=['aws','gcp','claude','nw'].map(name=>({dataset:{librarySection:name},hidden:false,querySelector(){}}));
const ctx=vm.createContext({document:{addEventListener(){},getElementById:node,querySelectorAll(s){return s==='[data-library-section]'?sections:[]},querySelector(){return {focus(){}}}},localStorage:{setItem(){},getItem(){return null}},console});
vm.runInContext(fs.readFileSync('public/app.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
ctx.rows=Array.from({length:25},(_,i)=>({id:i}));
assert.deepEqual(Array.from(run("pageRows(rows,'nw','2025:am2:all')"),x=>x.id),[0,1]);
assert.equal(node('nwPrev').disabled,true);assert.equal(node('nwNext').disabled,false);assert.match(node('nwPageStatus').textContent,/1–2 \/ 25件/);
run("STATE.libraryPages.nw.index=1");assert.deepEqual(Array.from(run("pageRows(rows,'nw','2025:am2:all')"),x=>x.id),[2,3]);
run("STATE.libraryPages.nw.index=12");assert.deepEqual(Array.from(run("pageRows(rows,'nw','2025:am2:all')"),x=>x.id),[24]);assert.equal(node('nwNext').disabled,true);
assert.deepEqual(Array.from(run("pageRows(rows,'nw','2024:am2:all')"),x=>x.id),[0,1],'Filter changes reset pagination');
assert.equal(run("pageRows([],'nw','empty').length"),0);assert.equal(node('nwNext').disabled,true);assert.equal(node('nwPageStatus').textContent,'0件');
run("showLibrarySection('gcp')");assert.deepEqual(sections.filter(s=>!s.hidden).map(s=>s.dataset.librarySection),['gcp']);
const html=fs.readFileSync('public/index.html','utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
assert.equal([...html.matchAll(/data-library-section=/g)].length,9);
assert(html.includes('id="libraryCount"'));assert(html.includes('<option value="100">100問</option>'));
console.log('Library paging: page boundaries, counts, filter reset, empty results, one visible collection, unique DOM IDs passed.');
