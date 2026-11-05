'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {enrichMarts}=require('../scripts/geocode-marts.cjs');
const key='a'.repeat(32),row={id:'mart:1',name:'마트',region:'09',address:'서울 주소',lat:null,lng:null,original:{LOC:'서울 주소'}};
test('REST collection adds separate coordinates without changing official address or lat/lng',async()=>{
  let auth;
  const out=await enrichMarts({facilities:[row]},null,key,async(url,opt)=>{auth=opt.headers.Authorization;return {ok:true,status:200,json:async()=>({documents:[{x:'127',y:'37.5'}]})}});
  assert.equal(auth,'KakaoAK '+key);assert.equal(out.data.facilities[0].geocodedLat,37.5);assert.equal(out.data.facilities[0].lat,null);assert.deepEqual(out.data.facilities[0].original,row.original);assert.equal(out.queried,1);
});
test('fallback strips building notes and validates road number, preserving source fields',async()=>{
  const address='경산시 하양읍 무학로 64-12(국군복지단무학마트)',queries=[];
  const out=await enrichMarts({facilities:[{...row,region:'',address}]},null,key,async url=>{
    queries.push(new URL(url).searchParams.get('query'));
    return {ok:true,status:200,json:async()=>({documents:queries.length===1 ? [] : [{x:'128.8',y:'35.9',road_address:{address_name:'경상북도 경산시 하양읍 무학로 64-12',region_1depth_name:'경상북도'}}]})};
  },{pause:async()=>{}});
  assert.deepEqual(queries,[address,'경산시 하양읍 무학로 64-12']);
  assert.equal(out.data.facilities[0].geocodeRegion,'06');assert.equal(out.data.facilities[0].address,address);assert.equal(out.data.facilities[0].region,'');
});
test('wrong road numbers and multiple exact points remain unlocated',()=>{
  const {exactPoint}=require('../scripts/geocode-marts.cjs');
  const point={x:'127',y:'37.5',road_address:{address_name:'서울 용산구 이태원로 173'}};
  assert.equal(exactPoint('서울 용산구 이태원로 174',[point]),null);
  assert.equal(exactPoint('서울 용산구 이태원로 173',[point,{...point,x:'127.1'}]),null);
});
test('not-found cache expires after seven days and legacy failures retry immediately',async()=>{
  const now=Date.parse('2026-11-05T00:00:00Z');let calls=0;
  const failed={...row,geocodeAddress:row.address,geocodeProvider:'kakao-address',geocodeStatus:'not_found',geocodeVersion:3,geocodedAt:new Date(now-86400000).toISOString()};
  const request=async()=>{calls++;return {ok:true,status:200,json:async()=>({documents:[]})};};
  const options={now,pause:async()=>{}};
  await enrichMarts({facilities:[row]},{facilities:[failed]},key,request,options);assert.equal(calls,0);
  await enrichMarts({facilities:[row]},{facilities:[{...failed,geocodedAt:new Date(now-8*86400000).toISOString()}]},key,request,options);assert.equal(calls,1);
  await enrichMarts({facilities:[row]},{facilities:[{...failed,geocodeVersion:undefined}]},key,request,options);assert.equal(calls,2);
});
test('road query retains numbered lanes and requires a real building number',()=>{
  const {roadQuery}=require('../scripts/geocode-addresses.cjs');
  assert.equal(roadQuery('대구광역시 수성구 고모로 33길 84(국군복지단오성마트)'),'대구광역시 수성구 고모로 33길 84');
  assert.equal(roadQuery('부산 강서구 대저동 공항진입로42번길 20'),'부산 강서구 대저동 공항진입로42번길 20');
  assert.equal(roadQuery('경기 파주시 보광로962'),'경기 파주시 보광로 962');
  assert.equal(roadQuery('강원도 홍천군 무궁화로4길 사랑아파트 내'),null);
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
