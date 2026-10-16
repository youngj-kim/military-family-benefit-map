'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {enrichMarts}=require('../scripts/geocode-marts.cjs');
const key='a'.repeat(32),row={id:'mart:1',name:'마트',address:'서울 주소',lat:null,lng:null,original:{LOC:'서울 주소'}};
test('REST collection adds separate coordinates without changing official address or lat/lng',async()=>{
  let auth;
  const out=await enrichMarts({facilities:[row]},null,key,async(url,opt)=>{auth=opt.headers.Authorization;return {ok:true,status:200,json:async()=>({documents:[{x:'127',y:'37.5'}]})}});
  assert.equal(auth,'KakaoAK '+key);assert.equal(out.data.facilities[0].geocodedLat,37.5);assert.equal(out.data.facilities[0].lat,null);assert.deepEqual(out.data.facilities[0].original,row.original);assert.equal(out.queried,1);
});
test('unchanged source addresses reuse saved coordinates without API calls',async()=>{
  const previous={facilities:[{...row,geocodeAddress:row.address,geocodeProvider:'kakao-address',geocodeStatus:'located',geocodedLat:37.5,geocodedLng:127}]};
  const out=await enrichMarts({facilities:[row]},previous,key,async()=>{throw Error('Should not be called')});
  assert.equal(out.queried,0);assert.equal(out.data.facilities[0].geocodedLng,127);
});
test('changed address is queried again and no result stays explicitly unlocated',async()=>{
  const out=await enrichMarts({facilities:[{...row,address:'새 주소'}]},{facilities:[{...row,geocodeAddress:row.address,geocodeProvider:'kakao-address',geocodeStatus:'located'}]},key,async()=>({ok:true,status:200,json:async()=>({documents:[]})}));
  assert.equal(out.queried,1);assert.equal(out.data.facilities[0].geocodeStatus,'not_found');assert.equal(out.data.facilities[0].geocodedLat,null);
});
test('authentication failure never includes the REST key in error output',async()=>{
  await assert.rejects(enrichMarts({facilities:[row]},null,key,async()=>({ok:false,status:401})),e=>e.message.includes('401')&&!e.message.includes(key));
});