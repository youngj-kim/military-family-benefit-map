'use strict';
const fs=require('node:fs'),path=require('node:path');
const {normalizeAddress}=require('./geocode-addresses.cjs');
const ROOT=path.resolve(__dirname,'..');
const method='kakao-keyword-exact-public-facility';
function publicFacility(row) {
  const name=normalizeAddress(row.name);
  if(name.endsWith('보건소'))return {name,jurisdiction:name.slice(0,-3),kind:'보건소'};
  const m=name.match(/^(.*(?:읍|면|동))(주민자치센터|주민센터|행정복지센터)$/);
  return m?{name,jurisdiction:m[1],kind:m[2]}:null;
}
function localName(value) {return normalizeAddress(value).replace(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|전북|전남|충북|충남|경북|경남|제주)/,'');}
function selectPublicPlace(row,documents,complete=true) {
  const target=publicFacility(row);
  if(!target)return {status:'excluded',reason:'특정 시설명으로 식별되지 않는 포괄 항목'};
  if(!complete)return {status:'review',reason:'검색 결과가 많아 유일한 시설인지 확인 불가'};
  const candidates=documents.filter(d=>localName(d.place_name)===localName(target.name) && normalizeAddress(d.road_address_name||d.address_name||'').includes(target.jurisdiction));
  const unique=[...new Map(candidates.map(d=>[d.id,d])).values()];
  if(unique.length!==1)return {status:'review',reason:unique.length?'시설명·지역 일치 결과가 여러 곳':'시설명·지역 완전 일치 결과 없음'};
  const d=unique[0],lat=Number(d.y),lng=Number(d.x);
  if(!(lat>=32&&lat<=39.5&&lng>=124&&lng<=132))return {status:'review',reason:'유효한 국내 좌표 없음'};
  return {status:'matched',lat,lng,address:d.road_address_name||d.address_name,placeName:d.place_name,placeId:d.id,placeUrl:'https://place.map.kakao.com/'+d.id,method};
}
async function run(){
 const key=process.env.KAKAO_REST_API_KEY?.trim();
 if(!/^[a-f0-9]{32}$/i.test(key||''))throw Error('Set KAKAO_REST_API_KEY repository secret.');
 const source=JSON.parse(fs.readFileSync(path.join(ROOT,'dist/facilities.json'),'utf8'));
 const file=path.join(ROOT,'data/location-overrides.json'),supplement=JSON.parse(fs.readFileSync(file,'utf8'));
 const missing=source.facilities.filter(r=>r.lat===null&&!supplement.overrides[r.id]&&/보건소|주민자치센터|주민센터|행정복지센터/.test(r.name));
 const now=new Date().toISOString(),results=[];let matched=0;
 for(const row of missing){
   let result;
   if(!publicFacility(row))result={status:'excluded',reason:'지역 전체 주민센터를 포괄하는 항목 — 개별 지점 임의 선택 안 함'};
   else{
    let response;try{response=await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?'+new URLSearchParams({query:row.name,size:15}),{headers:{Authorization:'KakaoAK '+key},signal:AbortSignal.timeout(15000)});}catch{throw Error('Public facility keyword lookup failed.');}
    if(!response.ok)throw Error('Public facility keyword lookup HTTP '+response.status);
    const data=await response.json();if(!Array.isArray(data.documents))throw Error('Invalid keyword response.');
    result=selectPublicPlace(row,data.documents,data.meta?.is_end===true);
    await new Promise(resolve=>setTimeout(resolve,200));
   }
   results.push({id:row.id,name:row.name,originalAddress:row.address,...result});
   if(result.status==='matched'){
    const {status,...place}=result;
    supplement.overrides[row.id]={...place,originalName:row.name,originalAddress:row.address,checkedAt:now};matched++;
   }
 }
 if(matched){supplement.checkedAt=now;fs.writeFileSync(file,JSON.stringify(supplement,null,2)+'\n');}
 fs.mkdirSync(path.join(ROOT,'reports'),{recursive:true});
 fs.writeFileSync(path.join(ROOT,'reports/public-facility-geocoding.json'),JSON.stringify({checkedAt:now,matched,review:results.filter(r=>r.status==='review').length,excluded:results.filter(r=>r.status==='excluded').length,results},null,2)+'\n');
 console.log('Public facility keyword matches: '+matched+'; reviewed/excluded: '+(results.length-matched));
}
if(require.main===module)run().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={publicFacility,selectPublicPlace};
