const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(geo){
 const urls=[],timers=new Map();let timer=0;
 const context=vm.createContext({module:{exports:{}},URL,console,document:{getElementById:()=>({textContent:''})},localStorage:{getItem:()=>null},navigator:{geolocation:geo},window:{BENEFIT_FACILITY_UTILS:require('../dist/facility-utils.js'),BENEFIT_ROUTE_LINKS:require('../dist/route-links.js'),open(){throw Error('Must not open a blank tab');},location:{assign:url=>urls.push(url)}},setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id)});
 vm.runInContext(fs.readFileSync('dist/app.js','utf8'),context);
 return {urls,timers,click:provider=>vm.runInContext(`openDirections({preventDefault(){}},{name:'시설',lat:37.5,lng:127.1},'${provider}')`,context)};
}
test('both providers wait on the visible page and then navigate with the current origin',()=>{
 for(const provider of ['kakao','naver']){
  let success;const f=setup({getCurrentPosition:fn=>{success=fn;}});
  f.click(provider);assert.equal(f.urls.length,0);
  success({coords:{latitude:37.4,longitude:127.2}});
  assert.equal(f.urls.length,1);assert.ok(f.urls[0].includes('37.4'));
 }
});
test('denied, unsupported, thrown, and unresponsive location all open destination instead of a blank page',()=>{
 for(const geo of [undefined,{getCurrentPosition:(_ok,fail)=>fail()},{getCurrentPosition(){throw Error('denied');}}]){
  const f=setup(geo);f.click('kakao');assert.equal(f.urls.length,1);assert.ok(f.urls[0].includes('/link/to/'));
 }
 let success;const f=setup({getCurrentPosition:fn=>{success=fn;}});f.click('naver');
 [...f.timers.values()].forEach(fn=>fn());assert.equal(f.urls.length,1);
 success({coords:{latitude:37.4,longitude:127.2}});assert.equal(f.urls.length,1);
 assert.ok(!new URL(f.urls[0]).searchParams.has('slat'));
});
