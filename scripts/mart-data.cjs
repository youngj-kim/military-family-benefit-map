'use strict';
const crypto=require('node:crypto');
const SOURCE='https://opendata.mnd.go.kr/openinf/sheetview2.jsp?infId=OA-9645';
const CATALOG='https://www.data.go.kr/data/15126305/fileData.do';
const ENDPOINT='https://opendata.mnd.go.kr/openinf/sheetexec.jsp?onepagerow=1000&infId=OA-9645&dsId=TB_MND_MART_CURRENT&strWhere=&filterCol=&txtFilter=&ibpage=1';
function parseSheet(text) {
  // IBSheet sends unquoted property names. Quote keys outside strings; never eval source text.
  let out='',quoted=false,escaped=false;
  for(let i=0;i<text.length;i++) {
    const ch=text[i];
    if(quoted) { out+=ch; if(escaped) escaped=false; else if(ch==='\\') escaped=true; else if(ch==='"') quoted=false; continue; }
    if(ch==='"') { quoted=true;out+=ch;continue; }
    if(ch===',') { let next=i+1; while(next<text.length && /\s/.test(text[next])) next++; if(text[next]===']' || text[next]==='}') continue; }
    if(/[A-Za-z_$]/.test(ch)) { let end=i+1;while(end<text.length&&/[A-Za-z0-9_$]/.test(text[end]))end++;const word=text.slice(i,end);let colon=end;while(/\s/.test(text[colon]||'')&&colon<text.length)colon++;out+=text[colon]===':'?JSON.stringify(word):word;i=end-1; }
    else out+=ch;
  }
  let data; try { data=JSON.parse(out.trim()); } catch { throw Error('Invalid official mart response syntax'); }
  if(!Array.isArray(data.DATA)||!data.DATA.length||Number(data.TOTAL)!==data.DATA.length)throw Error('Invalid or incomplete official mart response');
  return data.DATA;
}
function region(address) {
  if(/^서울/.test(address))return '09';if(/^(부산|울산)/.test(address))return '08';if(/^(대구|경북|경상북)/.test(address))return '06';if(/^(광주|전남|전라남)/.test(address))return '05';if(/^(대전|충남|충청남|세종)/.test(address))return '07';if(/^(충북|충청북)/.test(address))return '14';if(/^(전북|전라북)/.test(address))return '12';if(/^(경남|경상남)/.test(address))return '04';if(/^제주/.test(address))return '13';if(/^강원/.test(address))return /(강릉|동해|삼척|속초|양양|고성|태백)/.test(address)?'01':'02';if(/^인천/.test(address))return '10';if(/^경기/.test(address))return /(고양|파주|양주|의정부|동두천|연천|포천|남양주|구리|가평)/.test(address)?'03':'10';return '';
}
function snapshot(rows,sourceUpdatedAt,fetchedAt=new Date().toISOString()) {
  const text=v=>String(v??'').trim();
  const facilities=rows.map(r=>{
    const address=text(r.LOC),rawId=text(r.SEQ)||crypto.createHash('sha256').update(text(r.MART)+'|'+address).digest('hex').slice(0,16);
    return {id:'mart:'+rawId,name:text(r.MART),sourceKind:'mart',region:region(address),category:'23',type:'mart',address,area:address.split(/\s+/).slice(0,2).join(' '),benefit:'영외마트 · 이용 자격과 증빙서류를 확인한 뒤 방문하세요.',phone:text(r.TEL),website:'',lat:null,lng:null,weekdayHours:text(r.OP_WEEKDAY),saturdayHours:text(r.OP_SAT),sundayHours:text(r.OP_SUN),weekdayLunch:text(r.LUNCH_WEEKDAY),saturdayLunch:text(r.LUNCH_SAT),sundayLunch:text(r.LUNCH_SUN),notes:text(r.NOTE),scale:text(r.SCALE),original:r};
  });
  if(facilities.some(r=>!r.name||!r.address)||new Set(facilities.map(r=>r.id)).size!==facilities.length)throw Error('Invalid mart identities');
  return {fetchedAt,sourceUpdatedAt,source:SOURCE,catalog:CATALOG,endpoint:ENDPOINT,license:'국방부 원본 페이지: 공공누리 제3유형(출처표시+변경금지). 원문 필드 보존, 좌표는 별도 주소 조회.',facilities};
}
async function fetchMarts() {
  for(let attempt=0;attempt<3;attempt++) {
    try {
      const responses=await Promise.all([SOURCE,ENDPOINT].map(url=>fetch(url,{signal:AbortSignal.timeout(45000)})));
      if(responses.some(r=>!r.ok))throw Error('MND source HTTP failure');
      const [html,text]=await Promise.all(responses.map(r=>r.text()));
      const updated=html.match(/id\s*=\s*["']data_lt_dttm["'][^>]*>\s*(\d{4})\.(\d{2})\.(\d{2})/);
      if(!updated)throw Error('MND source update date unavailable');
      return snapshot(parseSheet(text),updated.slice(1,4).join('-'));
    } catch(error) {if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));}
  }
}
module.exports={SOURCE,CATALOG,ENDPOINT,parseSheet,snapshot,fetchMarts};
if(require.main===module) {
  const fs=require('node:fs'),path=require('node:path');
  const result=process.argv[2]?Promise.resolve(snapshot(parseSheet(fs.readFileSync(process.argv[2],'utf8')),process.argv[3]||'')):fetchMarts();
  result.then(data=>{fs.writeFileSync(path.join(__dirname,'../dist/marts.json'),JSON.stringify(data));console.log('Official marts saved: '+data.facilities.length);}).catch(error=>{console.error(error.message);process.exitCode=1});
}