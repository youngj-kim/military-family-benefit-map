'use strict';
const fs=require('node:fs');
const {normalizeAddress,manualReason,roadQuery,selectExact}=require('./geocode-addresses.cjs');
function comparable(value){return normalizeAddress(value).replace(/^세종세종시/,'세종');}
function addressMatches(original,road){
 const a=comparable(original),b=comparable(road);
 if(!b)return false;
 if(a===b)return true;
 // Source exports sometimes concatenate the floor/unit directly to the building number.
 return a.startsWith(b)&&/^(?:-0)?\d+(?:층|호)/.test(a.slice(b.length));
}
function selectPlace(row,documents){
 let matches=documents.filter(d=>addressMatches(row.address,d.road_address_name||''));
 const name=value=>value.toLowerCase().replace(/한국의학연구소|대한안과의사회|[\s()·-]/g,'');
 const named=matches.filter(d=>name(d.place_name||'')===name(row.name));
 if(named.length)matches=named;
 const unique=[...new Map(matches.map(d=>[d.x+','+d.y,d])).values()];
 if(unique.length!==1)return {status:'review',reason:unique.length?'동일 주소 후보가 여러 곳':'시설 검색 결과에서 원문 건물 주소를 확인하지 못함'};
 const d=unique[0],lat=Number(d.y),lng=Number(d.x);
 if(!(lat>=32&&lat<=39.5&&lng>=124&&lng<=132))return {status:'review',reason:'국내 좌표 범위 오류'};
 return {status:'matched',lat,lng,address:d.road_address_name,placeName:d.place_name,placeUrl:d.place_url,method:'kakao-keyword-matched-road-address'};
}
async function run(){
 const key=process.env.KAKAO_REST_API_KEY?.trim();
 if(!/^[a-f0-9]{32}$/i.test(key||''))throw Error('Set KAKAO_REST_API_KEY repository secret.');
 const source=JSON.parse(fs.readFileSync('dist/facilities.json','utf8'));
 const file='data/location-overrides.json',supplement=JSON.parse(fs.readFileSync(file,'utf8'));
 const rows=source.facilities.filter(r=>r.lat===null&&r.address&&!supplement.overrides[r.id]&&!manualReason(r)&&! / 및 |전체/.test(r.name));
 const now=new Date().toISOString(),results=[];
 for(const row of rows){
  const documents=[];
  const names=[row.name,row.name.replace(/^대한안과의사회-/,'').replace(/^(강릉시|보령시|서천군|양양군|창원시|철원군|평창군|횡성군|홍천군)\s*/,'').replace('검진센터','').replace('한국의학연구소','')];
  for(const query of new Set(names)){
   for(let page=1;page<=3;page++){
    const response=await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?'+new URLSearchParams({query,size:15,page}),{headers:{Authorization:'KakaoAK '+key},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Kakao keyword HTTP '+response.status);
    const data=await response.json();if(!Array.isArray(data.documents))throw Error('Invalid keyword response');
    documents.push(...data.documents);if(data.meta?.is_end)break;
   }
  }
  let result=selectPlace(row,documents);
  if(result.status!=='matched'){
   const road=roadQuery(row.address),area=comparable(row.area||'');
   if(road&&area){
    const compact=comparable(road);
    if(compact.startsWith(area)){
     const query=row.area+' '+compact.slice(area.length);
     const response=await fetch('https://dapi.kakao.com/v2/local/search/address.json?'+new URLSearchParams({query,size:30}),{headers:{Authorization:'KakaoAK '+key},signal:AbortSignal.timeout(15000)});
     if(!response.ok)throw Error('Kakao address HTTP '+response.status);
     const data=await response.json();
     const exact=selectExact(row,data.documents||[]);
     if(exact.status==='matched')result={...exact,address:exact.matchedAddress};
    }
   }
  }
  results.push({id:row.id,name:row.name,originalAddress:row.address,...result,...(result.status==='review'?{candidates:documents.map(d=>({name:d.place_name,address:d.road_address_name,lat:d.y,lng:d.x,url:d.place_url}))}:{})});
  if(result.status==='matched'){
   const {status,...place}=result;
   supplement.overrides[row.id]={...place,originalName:row.name,originalAddress:row.address,checkedAt:now};
  }
 }
 const matched=results.filter(r=>r.status==='matched').length;
 if(matched){supplement.checkedAt=now;fs.writeFileSync(file,JSON.stringify(supplement,null,2)+'\n');}
 fs.writeFileSync('reports/named-address-geocoding.json',JSON.stringify({checkedAt:now,matched,review:results.length-matched,results},null,2)+'\n');
 console.log('Named address matches: '+matched+'; review: '+(results.length-matched));
}
if(require.main===module)run().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={addressMatches,selectPlace};
