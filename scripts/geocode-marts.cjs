'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {isDeepStrictEqual} = require('node:util');
const {roadQuery, normalizeAddress} = require('./geocode-addresses.cjs');
const {region} = require('./mart-data.cjs');
const RETRY_MS = 7 * 24 * 60 * 60 * 1000;
const VERSION = 2;
const fields = ['geocodedLat','geocodedLng','geocodeAddress','geocodedAt','geocodeProvider','geocodeStatus','geocodeVersion','geocodeRegion'];
const domestic = point => point && Number(point.y) >= 32 && Number(point.y) <= 39.5 && Number(point.x) >= 124 && Number(point.x) <= 132;
function exactPoint(address, documents) {
  const road = roadQuery(address);
  const expected = road && normalizeAddress(road);
  const hasProvince = /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|전라|전남|전북|경상|경남|경북|충청|충남|충북|제주)/.test(address);
  const matches = documents.filter(point => {
    if (!domestic(point)) return false;
    if (!expected) return documents.length === 1;
    const actual = normalizeAddress(point.road_address?.address_name || '');
    return actual === expected || (!hasProvince && actual.endsWith(expected));
  });
  const unique = [...new Map(matches.map(point => [`${point.x},${point.y}`,point])).values()];
  return unique.length === 1 ? unique[0] : null;
}
async function enrichMarts(data, previous, key, request = fetch, options = {}) {
  const now = options.now ?? Date.now();
  const pause = options.pause || (ms => new Promise(resolve => setTimeout(resolve,ms)));
  const old = new Map((previous?.facilities || []).map(row => [row.id,row]));
  const result = JSON.parse(JSON.stringify(data));
  let queried = 0;
  for (const row of result.facilities) {
    const cached = old.get(row.id);
    const age = now - Date.parse(cached?.geocodedAt);
    const validSuccess = cached?.geocodeStatus === 'located' && domestic({x:cached.geocodedLng,y:cached.geocodedLat});
    const freshFailure = cached?.geocodeStatus === 'not_found' && cached.geocodeVersion === VERSION && age >= 0 && age < RETRY_MS;
    if (cached?.geocodeAddress === row.address && cached.geocodeProvider === 'kakao-address' && (validSuccess || freshFailure) && (row.region || cached.geocodeRegion || !validSuccess)) {
      for (const field of fields) if (cached[field] !== undefined) row[field] = cached[field];
      continue;
    }
    if (!key) continue;
    if (!/^[a-f0-9]{32}$/i.test(key.trim())) throw Error('KAKAO_REST_API_KEY format is invalid');
    const queries = [...new Set([row.address,roadQuery(row.address)].filter(Boolean))];
    let point = null;
    for (const query of queries) {
      const url = 'https://dapi.kakao.com/v2/local/search/address.json?' + new URLSearchParams({query,size:'10'});
      let response;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { response = await request(url,{headers:{Authorization:'KakaoAK '+key.trim()},signal:AbortSignal.timeout(20000)}); }
        catch { throw Error('Kakao address request failed'); }
        if (response.status === 429 && attempt < 2) { await pause(2000 * (attempt + 1)); continue; }
        break;
      }
      if (!response.ok) throw Error('Kakao address lookup failed (HTTP '+response.status+'). Verify the REST key and Local API access.');
      const body = await response.json();
      point = exactPoint(row.address,body.documents || []);
      await pause(100);
      if (point) break;
    }
    const responseAddress = point?.road_address || point?.address;
    const province = responseAddress?.region_1depth_name || point?.address?.region_1depth_name || '';
    const resolvedRegion = point ? region(responseAddress?.address_name || point.address_name || '') || region(province+' '+row.address) : '';
    Object.assign(row,{geocodedLat:point ? Number(point.y) : null,geocodedLng:point ? Number(point.x) : null,geocodeAddress:row.address,geocodedAt:new Date(now).toISOString(),geocodeProvider:'kakao-address',geocodeStatus:point ? 'located' : 'not_found',geocodeVersion:VERSION,geocodeRegion:resolvedRegion});
    queried++;
  }
  return {data:result,queried,located:result.facilities.filter(row => row.geocodeStatus === 'located').length};
}
module.exports = {enrichMarts,exactPoint,RETRY_MS};
if (require.main === module) {
  const file = path.join(__dirname,'../dist/marts.json');
  const data = JSON.parse(fs.readFileSync(file,'utf8'));
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) { console.error('KAKAO_REST_API_KEY repository secret is required'); process.exitCode = 1; }
  else enrichMarts(data,data,key).then(result => {
    if (!isDeepStrictEqual(data,result.data)) fs.writeFileSync(file,JSON.stringify(result.data));
    console.log(JSON.stringify({queried:result.queried,located:result.located,total:result.data.facilities.length}));
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
