const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('dist/app.js','utf8').replace(/boot\(\);\s*$/, '');
function setup(initial='[]',fail=false) {
  const storage = new Map([['benefit-map-favorites-v1',initial]]), status = {textContent:''};
  const context = vm.createContext({URL,Set,Map,console,location:{href:'https://example.com/?old=1#map'},document:{getElementById:()=>status},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>{if(fail)throw Error('storage');storage.set(key,value);}},navigator:{clipboard:{writeText:async value=>{context.copied=value;}}},window:{}});
  context.setTimeout = () => 1; context.clearTimeout = () => {};
  vm.runInContext(source,context);
  vm.runInContext('filterRows = () => {}; selectFacility = () => {};',context);
  return {context,storage,status,run:code=>vm.runInContext(code,context)};
}
test('favorites persist and source IDs remain distinct',()=>{
  const {run,storage}=setup();
  run("toggleSaved({id:'12'}); toggleSaved({id:'12',sourceKind:'mart'});");
  assert.deepEqual(JSON.parse(storage.get('benefit-map-favorites-v1')),['mma:12','mart:12']);
  run("toggleSaved({id:'12'});");
  assert.deepEqual(JSON.parse(storage.get('benefit-map-favorites-v1')),['mart:12']);
});
test('malformed saved data and denied storage do not break browsing',()=>{
  assert.equal(setup('{broken').run('saved.size'),0);
  assert.equal(setup('{}').run('saved.size'),0);
  const {run,status}=setup('[]',true);
  run("toggleSaved({id:'12'});");
  assert.equal(run('saved.size'),0);
  assert.match(status.textContent,/저장할 수 없습니다/);
});
test('shared URLs identify a facility and exclude old query and hash',async()=>{
  const {run,context}=setup();
  const url=new URL(run("facilityUrl({id:'12',sourceKind:'mart'})"));
  assert.equal(url.searchParams.get('facility'),'mart:12');
  assert.equal(url.searchParams.has('old'),false);assert.equal(url.hash,'');
  await run("shareFacility({id:'12',name:'테스트'})");
  assert.equal(new URL(context.copied).searchParams.get('facility'),'mma:12');
});
