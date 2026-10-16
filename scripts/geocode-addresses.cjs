'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
function normalizeAddress(value) {
  return value.replace(/\([^)]*\)/g, '').trim()
    .replace(/^서울특별시/, '서울').replace(/^부산광역시/, '부산').replace(/^대구광역시/, '대구')
    .replace(/^인천광역시/, '인천').replace(/^광주광역시/, '광주').replace(/^대전광역시/, '대전')
    .replace(/^울산광역시/, '울산').replace(/^세종특별자치시/, '세종').replace(/^경기도/, '경기')
    .replace(/^강원(?:특별자치)?도/, '강원').replace(/^전북(?:특별자치)?도|^전라북도/, '전북')
    .replace(/^제주특별자치도/, '제주').replace(/^충청북도/, '충북').replace(/^충청남도/, '충남')
    .replace(/^전라남도/, '전남').replace(/^경상북도/, '경북').replace(/^경상남도/, '경남')
    .replace(/\s/g, '').replace(/-0$/, '');
}
function roadQuery(address) {
  const clean = address.replace(/\([^)]*\)/g, '').trim();
  const match = clean.match(/^(.*?(?:로|길)\s*\d+(?:\s*-\s*\d+)?)/);
  return match ? match[1].replace(/\s*-\s*/g, '-').replace(/-0$/, '') : null;
}
function manualReason(row) {
  if (/과\)|과\s*$|담당|시청|군청|구청|생활체육과|공원녹지과|경제교통과|건설교통실/.test(row.address)) return '담당 부서/관청 주소 — 실제 이용 시설 확인 필요';
  if (/전국|휴양시설|군 복지시설|체육시설|주민자치센터|공영주차장|공설주차장|장사시설|지정문화재|관광시설|_/.test(row.name)) return '여러 지점 또는 포괄 시설 — 지점별 확인 필요';
  return null;
}
function selectExact(row, documents) {
  const query = roadQuery(row.address);
  if (!query) return {status:'review', reason:'도로명·건물번호를 명확하게 분리하지 못함'};
  const candidates = documents.filter(d => d.road_address && normalizeAddress(d.road_address.address_name) === normalizeAddress(query));
  const unique = [...new Map(candidates.map(d => [d.x+','+d.y,d])).values()];
  if (unique.length !== 1) return {status:'review', reason:unique.length ? '동일 주소에 여러 좌표 — 검토 필요' : '도로명 주소 완전 일치 결과 없음'};
  const d=unique[0],lat=Number(d.y),lng=Number(d.x);
  if (!(lat>=32&&lat<=39.5&&lng>=124&&lng<=132)) return {status:'review',reason:'응답 좌표가 국내 범위를 벗어남'};
  return {status:'matched',lat,lng,matchedAddress:d.road_address.address_name,query,method:'kakao-road-address-exact'};
}
async function run() {
  const key=process.env.KAKAO_REST_API_KEY;
  if(!key || !/^[a-f0-9]{32}$/i.test(key.trim())) throw Error('Set the KAKAO_REST_API_KEY repository secret.');
  const source=JSON.parse(fs.readFileSync(path.join(ROOT,'dist/facilities.json'),'utf8'));
  const missing=source.facilities.filter(r=>r.lat===null||r.lng===null);
  const rows=missing.filter(r=>r.address),noAddress=missing.filter(r=>!r.address);
  const checkedAt=new Date().toISOString(), results=[], overrides={};
  for(const row of rows) {
    const manual=manualReason(row),query=roadQuery(row.address);
    let result;
    if(manual) result={status:'review',reason:manual};
    else if(!query) result={status:'review',reason:'도로명 주소 형식 아님 — 수동 확인 필요'};
    else {
      let response;
      try { response=await fetch('https://dapi.kakao.com/v2/local/search/address.json?'+new URLSearchParams({query,analyze_type:'exact',size:'30'}),{headers:{Authorization:'KakaoAK '+key.trim()},signal:AbortSignal.timeout(15000)}); }
      catch { throw Error('Kakao address lookup failed; no live data modified.'); }
      if(!response.ok) throw Error('Kakao address lookup HTTP '+response.status+'; no live data modified.');
      const data=await response.json();
      if(!Array.isArray(data.documents)) throw Error('Invalid Kakao response; no live data modified.');
      result=selectExact(row,data.documents);
      await new Promise(resolve=>setTimeout(resolve,220));
    }
    results.push({id:row.id,name:row.name,originalAddress:row.address,...result});
    if(result.status==='matched') overrides[row.id]={lat:result.lat,lng:result.lng,address:result.matchedAddress,method:result.method,originalAddress:row.address,originalName:row.name,checkedAt};
    if(results.length%25===0) console.log('Checked '+results.length+'/'+rows.length+' address candidates.');
  }
  const output=path.join(ROOT,'.geocode-output');fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'location-overrides.json'),JSON.stringify({checkedAt,sourceFetchedAt:source.fetchedAt,overrides},null,2));
  fs.writeFileSync(path.join(output,'address-geocoding-review.json'),JSON.stringify({checkedAt,total:rows.length,matched:Object.keys(overrides).length,review:results.filter(r=>r.status!=='matched').length,results},null,2));
  fs.writeFileSync(path.join(output,'without-address-124.json'),JSON.stringify({sourceFetchedAt:source.fetchedAt,count:noAddress.length,facilities:noAddress},null,2));
  const summary=`Address candidates ${rows.length}; exact road-address matches ${Object.keys(overrides).length}; manual review ${results.filter(r=>r.status!=='matched').length}; no address ${noAddress.length}.`;
  console.log(summary);
  if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n\nNo published data has been changed.\n');
}
if(require.main===module) run().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={normalizeAddress,roadQuery,manualReason,selectExact};
