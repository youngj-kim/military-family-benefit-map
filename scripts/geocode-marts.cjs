'use strict';
const fs=require('node:fs'),path=require('node:path');
const {isDeepStrictEqual}=require('node:util');
async function enrichMarts(data,previous,key,request=fetch) {
  const old=new Map((previous?.facilities||[]).map(r=>[r.id,r]));
  const result=JSON.parse(JSON.stringify(data));
  const fields=['geocodedLat','geocodedLng','geocodeAddress','geocodedAt','geocodeProvider','geocodeStatus'];
  let queried=0;
  for(const row of result.facilities) {
    const cached=old.get(row.id);
    if(cached?.geocodeAddress===row.address && cached.geocodeProvider==='kakao-address' && cached.geocodeStatus) {
      for(const field of fields)if(cached[field]!==undefined)row[field]=cached[field];
      continue;
    }
    if(!key)continue;
    if(!/^[a-f0-9]{32}$/i.test(key.trim()))throw Error('KAKAO_REST_API_KEY format is invalid');
    const url='https://dapi.kakao.com/v2/local/search/address.json?'+new URLSearchParams({query:row.address,size:'1'});
    let response;
    for(let attempt=0;attempt<3;attempt++) {
      try {response=await request(url,{headers:{Authorization:'KakaoAK '+key.trim()},signal:AbortSignal.timeout(20000)});} catch {throw Error('Kakao address request failed');}
      if(response.status===429 && attempt<2){await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));continue;}
      break;
    }
    if(!response.ok)throw Error('Kakao address lookup failed (HTTP '+response.status+'). Verify the REST key and Local API access.');
    const body=await response.json(),point=body.documents?.[0];
    const lat=Number(point?.y),lng=Number(point?.x),located=!!point&&lat>=32&&lat<=39.5&&lng>=124&&lng<=132;
    Object.assign(row,{geocodedLat:located?lat:null,geocodedLng:located?lng:null,geocodeAddress:row.address,geocodedAt:new Date().toISOString(),geocodeProvider:'kakao-address',geocodeStatus:located?'located':'not_found'});
    queried++;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  return {data:result,queried,located:result.facilities.filter(r=>r.geocodeStatus==='located').length};
}
module.exports={enrichMarts};
if(require.main===module) {
  const file=path.join(__dirname,'../dist/marts.json');
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  const key=process.env.KAKAO_REST_API_KEY;
  if(!key){console.error('KAKAO_REST_API_KEY repository secret is required');process.exitCode=1;}
  else enrichMarts(data,data,key).then(result=>{
    if(!isDeepStrictEqual(data,result.data))fs.writeFileSync(file,JSON.stringify(result.data));
    console.log(JSON.stringify({queried:result.queried,located:result.located,total:result.data.facilities.length}));
  }).catch(error=>{console.error(error.message);process.exitCode=1;});
}