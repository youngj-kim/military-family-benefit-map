'use strict';
const crypto = require('node:crypto');
const SOURCE = 'https://www.mma.go.kr/hall/listpart.do?mc=mma0003392';
const ENDPOINT = 'https://open.mma.go.kr/caisGGGS/bymmgPartAjaxJsonCall.json?udjiyeok_cd=&udggeopjong_gbcd=&callback=mmaCallback';
const FIELDS = ['id','name','region','category','type','address','area','benefit','phone','website','lat','lng'];
const clean = v => String(v ?? '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
function parseOfficial(raw, now = new Date().toISOString()) {
  const text = raw.trim();
  const match = text.match(/^mmaCallback\s*\(([\s\S]*)\)\s*;?$/);
  const data = JSON.parse(text.startsWith('{') ? text : match ? match[1] : 'null');
  if (data?.success !== true || !Array.isArray(data.list) || !data.list.length) throw Error('Invalid MMA response');
  const facilities = data.list.map(r => {
    const lat = Number(r.wido_vl), lng = Number(r.gyeongdo_vl);
    const located = lat >= 32 && lat <= 39.5 && lng >= 124 && lng <= 132;
    return {id:clean(r.mmgudgigwan_cd),name:clean(r.udae_ggm),region:clean(r.udjiyeok_cd),category:clean(r.udggeopjong_gbcd),type:clean(r.udae_gbcd),address:clean(r.addr),area:clean(r.displayaddr),benefit:clean(r.udsangse_cn),phone:clean(r.udgigwan_telno),website:clean(r.hmpg_addr),lat:located?lat:null,lng:located?lng:null};
  });
  validateRows(facilities);
  return {fetchedAt:now,source:SOURCE,endpoint:ENDPOINT,facilities};
}
function validateRows(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.some(r => !r.id || !r.name)) throw Error('Missing facility identity');
  if (new Set(rows.map(r => r.id)).size !== rows.length) throw Error('Duplicate facility IDs');
}
function canonical(rows) {
  validateRows(rows);
  return JSON.stringify([...rows].sort((a,b) => a.id.localeCompare(b.id)).map(r => Object.fromEntries(FIELDS.map(k => [k,r[k] ?? (['lat','lng'].includes(k)?null:'')]))));
}
function fingerprint(rows) { return crypto.createHash('sha256').update(canonical(rows)).digest('hex'); }
function compare(before,after) {
  validateRows(before); validateRows(after);
  const old = new Map(before.map(r=>[r.id,r])), next = new Map(after.map(r=>[r.id,r]));
  return {added:after.filter(r=>!old.has(r.id)),removed:before.filter(r=>!next.has(r.id)),changed:after.filter(r=>old.has(r.id)).map(r=>({before:old.get(r.id),after:r,fields:FIELDS.filter(k=>k!=='id' && (old.get(r.id)[k]??null)!==(r[k]??null))})).filter(r=>r.fields.length)};
}
const md = v => String(v ?? '없음').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([\\`*_{}\[\]()#+!|])/g,'\\$1').replace(/\r?\n/g,' / ');
function report(before,after,diff) {
  const labels={name:'시설명',region:'지역',category:'업종',type:'혜택 종류',address:'주소',area:'지역명',benefit:'혜택 내용',phone:'연락처',website:'홈페이지',lat:'위도',lng:'경도'};
  const lines=['# 병무청 예우시설 변경 검토','',`확인 시각: ${after.fetchedAt}`,`기준 데이터: ${before.fetchedAt}`,'',`추가 ${diff.added.length}건 · 삭제 ${diff.removed.length}건 · 변경 ${diff.changed.length}건`,'',`[병무청 공식 출처](${SOURCE})`,'','이 후보는 자동 배포하지 않습니다. 변경 내용을 확인한 뒤 데이터 업데이트 PR을 병합하세요.',''];
  for (const [title,rows] of [['추가 시설',diff.added],['삭제 시설',diff.removed]]) { lines.push(`## ${title}`,''); for (const r of rows) lines.push(`- ${md(r.name)} (ID ${md(r.id)}) · ${md(r.address || r.area)}`); if(!rows.length) lines.push('없음'); lines.push(''); }
  lines.push('## 변경 시설','');
  for (const r of diff.changed) { lines.push(`### ${md(r.after.name)} (ID ${md(r.after.id)})`,''); for (const field of r.fields) lines.push(`- ${labels[field] || field}: ${md(r.before[field])} → ${md(r.after[field])}`); lines.push(''); }
  if (!diff.changed.length) lines.push('없음','');
  return lines.join('\n');
}
async function fetchOfficial() {
  for (let attempt=0;attempt<3;attempt++) {
    try { const response=await fetch(ENDPOINT,{signal:AbortSignal.timeout(45000)}); if(!response.ok) throw Error('MMA HTTP '+response.status); const text=await response.text(); if(text.length>20000000) throw Error('MMA response too large'); return parseOfficial(text); }
    catch(error) { if(attempt===2) throw error; await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1))); }
  }
}
module.exports={SOURCE,ENDPOINT,FIELDS,parseOfficial,validateRows,canonical,fingerprint,compare,report,fetchOfficial};