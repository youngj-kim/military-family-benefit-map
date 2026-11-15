'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {destinationRouteUrl,addressSearchUrl}=require('../dist/route-links.js');
const row={name:'시설 & 쉼터 / 1',lat:37.818336,lng:127.711765};
test('Kakao directions identify destination without an origin',()=>{
 const u=new URL(destinationRouteUrl(row,'kakao'));
 assert.equal(u.origin,'https://map.kakao.com');
 assert.equal(decodeURIComponent(u.pathname),'/link/to/'+row.name+','+row.lat+','+row.lng);
 assert.ok(!u.pathname.includes('/from/'));
});
test('Naver directions preserve destination and never include current location',()=>{
 const u=new URL(destinationRouteUrl(row,'naver'));
 assert.equal(u.origin,'https://map.naver.com');
 for(const [k,v]of Object.entries({elng:String(row.lng),elat:String(row.lat),etext:row.name,menu:'route',pathType:'0'}))assert.equal(u.searchParams.get(k),v);
 for(const k of ['slat','slng','stext','appkey'])assert.ok(!u.searchParams.has(k));
});
test('missing coordinates fall back to encoded address search on each provider',()=>{
 const r={name:'럭키',lat:null,lng:null,address:'경기도 성남시 이매로 173(럭키회관 1층)'};
 for(const provider of ['kakao','naver']){
  const u=new URL(destinationRouteUrl(r,provider));
  assert.equal(decodeURIComponent(u.pathname.split('/').pop()),r.address);
  assert.ok(u.pathname.includes('/search/'));
  assert.equal(u.search,'');
 }
 assert.equal(addressSearchUrl({address:'  '}),null);
 assert.equal(destinationRouteUrl({...r,address:''}),null);
});
test('explicit current position becomes the route origin for both providers',()=>{
 const origin={lat:37.5,lng:127.1};
 const kakao=new URL(destinationRouteUrl(row,'kakao',origin));
 assert.ok(decodeURIComponent(kakao.pathname).startsWith('/link/by/car/현재 위치,37.5,127.1/'));
 const naver=new URL(destinationRouteUrl(row,'naver',origin));
 assert.equal(naver.searchParams.get('slat'),'37.5');
 assert.equal(naver.searchParams.get('slng'),'127.1');
 assert.equal(naver.searchParams.get('stext'),'현재 위치');
 assert.equal(naver.searchParams.get('elat'),String(row.lat));
});
