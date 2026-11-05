const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {appendHistory}=require('../scripts/update-history.cjs');
const report=fs.readFileSync('updates/mma-changes.md','utf8');
test('archives both sources and preserves previous releases without duplicate IDs',()=>{
 const first=appendHistory([],report,'first');
 assert.deepEqual(first[0].sources.mma,{added:27,removed:4,modified:32});
 assert.deepEqual(first[0].sources.marts,{added:0,removed:0,modified:0});
 assert.ok(!first[0].report.includes('이 후보는 자동 배포하지 않습니다'));
 assert.equal(appendHistory(first,report,'first'),first);
 const next=appendHistory(first,report,'next'); assert.equal(next.length,2);assert.equal(next[1],first[0]);
 assert.throws(()=>appendHistory([], 'invalid', 'bad'));
});
const vm=require('node:vm');
test('new releases show a badge without interrupting the map; button opens history',async()=>{
 class Node {constructor(){this.children=[];this.handlers={};this.open=false;this.classes=new Set();this.classList={add:v=>this.classes.add(v),remove:v=>this.classes.delete(v)};}append(n){this.children.push(n)}replaceChildren(){this.children=[]}addEventListener(n,f){this.handlers[n]=f}showModal(){this.open=true}close(){this.open=false;this.handlers.close?.()}}
 const entries=JSON.parse(fs.readFileSync('dist/update-history.json','utf8'));
 const saved=new Map();
 async function boot(){const nodes=Object.fromEntries(['show-updates','update-dialog','update-history-content','close-updates'].map(id=>[id,new Node()]));
 vm.runInNewContext(fs.readFileSync('dist/update-history.js','utf8'),{document:{getElementById:id=>nodes[id],createElement:()=>new Node()},fetch:async()=>({ok:true,json:async()=>entries}),localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)}});
 await new Promise(resolve=>setImmediate(resolve));return nodes;}
 const first=await boot();assert.equal(first['update-dialog'].open,false);assert.equal(first['update-history-content'].children.length,1);assert.ok(first['show-updates'].classes.has('has-update'));
 first['show-updates'].handlers.click();assert.equal(first['update-dialog'].open,true);assert.equal(first['show-updates'].classes.has('has-update'),false);
 first['close-updates'].handlers.click();assert.equal(first['update-dialog'].open,false);
 const repeat=await boot();assert.equal(repeat['update-dialog'].open,false);repeat['show-updates'].handlers.click();assert.equal(repeat['update-dialog'].open,true);
 entries.unshift({...entries[0],id:'next'});assert.equal((await boot())['show-updates'].classes.has('has-update'),true);
});
