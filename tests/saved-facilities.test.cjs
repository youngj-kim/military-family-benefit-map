const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('dist/app.js','utf8');
function setup(initial='[]',fail=false) {
  const storage = new Map([['benefit-map-favorites-v1',initial]]), status = {textContent:''};
  const context = vm.createContext({module:{exports:{}},URL,Set,Map,console,location:{href:'https://example.com/?old=1#map'},document:{getElementById:()=>status},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>{if(fail)throw Error('storage');storage.set(key,value);}},navigator:{clipboard:{writeText:async value=>{context.copied=value;}}},window:{BENEFIT_FACILITY_UTILS:require('../dist/facility-utils.js')}});
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
test('saving a selected facility updates its button without selecting or navigating again',()=>{
  const {run,context}=setup();
  context.button={textContent:'',setAttribute:(name,value)=>{context.pressed=value;}};
  run("selected = {id:'12'}; document.getElementById = id => id === 'save-facility' ? button : {textContent:''}; selectFacility = () => {throw Error('Unexpected navigation')}; toggleSaved(selected);");
  assert.equal(context.button.textContent,'★ 저장됨');assert.equal(context.pressed,'true');
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
test('markers and images are reused across viewport changes',()=>{
  const {run,context}=setup();const counts={markers:0,images:0,added:0,removed:0};
  context.kakao={maps:{Marker:class{constructor(){counts.markers++;}},MarkerImage:class{constructor(){counts.images++;}},LatLng:class{},Size:class{},Point:class{},event:{addListener(){}}}};
  context.window.BENEFIT_CATEGORY_ICONS={'05':'svg'};
  context.cluster={addMarkers:items=>{counts.added+=items.length;},removeMarkers:items=>{counts.removed+=items.length;},redraw(){}};
  run("map = {}; clusterer = cluster; filtered = [{id:'1',type:'02',category:'05',lat:37,lng:127},{id:'2',type:'02',category:'05',lat:37,lng:127}];");
  run('module.exports.renderMarkers(); module.exports.renderMarkers();');
  assert.equal(counts.markers,2);assert.equal(counts.images,1);assert.equal(counts.added,2);
  run('filtered = filtered.slice(0,1); module.exports.renderMarkers();');assert.equal(counts.removed,1);
  run("filtered.push({id:'2',type:'02',category:'05',lat:37,lng:127}); module.exports.renderMarkers();");
  assert.equal(counts.markers,2);assert.equal(counts.images,1);assert.equal(counts.added,3);
});
test('viewport updates retain loaded list length and scroll while new filters reset the limit',()=>{
  const {run,context}=setup();
  const aside={scrollTop:321};const nodes={search:{value:''},region:{value:''},category:{value:''},inbounds:{checked:false},'saved-only':{checked:false},'saved-count':{}};
  context.document={getElementById:id=>nodes[id]||(nodes[id]={}),querySelector:selector=>selector==='aside'?aside:{value:selector.includes('dataset')?'all':''}};
  run("updateSourceNotes = () => {}; renderList = () => {document.querySelector('aside').scrollTop=0;}; renderMarkers = () => {}; facilities=[{id:'1',name:'A',address:'',area:'',benefit:'',category:'05'}]; limit=120; module.exports.filterRows({resetLimit:false,preserveScroll:true});");
  assert.equal(run('limit'),120);assert.equal(aside.scrollTop,321);
  run('module.exports.filterRows();');assert.equal(run('limit'),60);
});
