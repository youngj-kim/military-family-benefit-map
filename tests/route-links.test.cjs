'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {naverRouteUrl}=require('../dist/route-links.js');
const row={name:'시설 & 쉼터 / 1',lat:37.818336,lng:127.711765};
test('Naver link preserves WGS84 origin/destination and safely encodes facility names',()=>{
  const u=new URL(naverRouteUrl(row,{coords:{latitude:37.464007,longitude:126.9522394}}));
  assert.equal(u.origin,'https://map.naver.com');
  for(const [k,v] of Object.entries({elng:'127.711765',elat:'37.818336',etext:row.name,slng:'126.9522394',slat:'37.464007',stext:'현재 위치',menu:'route',pathType:'0'})) assert.equal(u.searchParams.get(k),v);
  assert.ok(!u.searchParams.has('appkey'));
});
test('destination-only link does not fabricate a current location',()=>{
  const u=new URL(naverRouteUrl(row)); assert.ok(!u.searchParams.has('slat')); assert.ok(!u.searchParams.has('slng')); assert.equal(u.searchParams.get('etext'),row.name);
});const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function controller() {
  let success, failure, target;
  const context=vm.createContext({document:{},window:{isSecureContext:true,BENEFIT_ROUTE_LINKS:{naverRouteUrl},location:{assign:url=>{target=url}}},navigator:{geolocation:{getCurrentPosition:(ok,fail)=>{success=ok;failure=fail}}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/app.js'),'utf8').replace(/boot\(\);\s*$/,''),context);
  return {context,success:()=>success,failure:()=>failure,target:()=>target};
}
test('current-location buttons navigate to their chosen provider',()=>{
  for(const [provider,host] of [['naver','map.naver.com'],['kakao','map.kakao.com']]) {
    const c=controller(),button={textContent:provider+' 길찾기',isConnected:true},message={};
    c.context.startCurrentRoute(row,button,message,provider);
    c.success()({coords:{latitude:37.464007,longitude:126.9522394}});
    assert.equal(new URL(c.target()).hostname,host); assert.equal(button.textContent,provider+' 길찾기'); assert.equal(button.disabled,false);
  }
});
test('permission denial preserves the chosen button and does not navigate',()=>{
  const c=controller(),button={textContent:'네이버 현위치 길찾기 ↗',isConnected:true},message={};
  c.context.startCurrentRoute(row,button,message,'naver'); c.failure()({code:1});
  assert.equal(c.target(),undefined); assert.equal(button.textContent,'네이버 현위치 길찾기 ↗'); assert.match(message.textContent,/권한/);
});
