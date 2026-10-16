'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {fetchOfficial, fingerprint, compare, report} = require('./mma-data.cjs');
const {fetchMarts} = require('./mart-data.cjs');
const {enrichMarts} = require('./geocode-marts.cjs');
const ROOT = path.join(__dirname,'..');
const BRANCH = 'mma-facility-update';
const OUTPUT = path.join(ROOT,'.monitor-output');
const repository = process.env.GITHUB_REPOSITORY || 'youngj-kim/military-family-benefit-map';
if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw Error('Invalid repository');
const repoUrl = 'https://github.com/'+repository;
async function api(route, method='GET', body, missing=false) {
  const response=await fetch('https://api.github.com/repos/'+repository+route,{method,headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  if (missing && response.status===404) return null;
  if (!response.ok) throw Error('GitHub API '+response.status+' ('+method+' '+route.split('?')[0]+')');
  return response.json();
}
async function branchFile(file) {
  const content=await api('/contents/'+file+'?ref='+BRANCH,'GET',undefined,true);
  if (!content) return null;
  return {value:JSON.parse(Buffer.from(content.content,'base64').toString('utf8')),sha:content.sha};
}
async function telegram(message) {
  const token=process.env.TELEGRAM_BOT_TOKEN, chat=process.env.TELEGRAM_CHAT_ID;
  if(!token || !chat) throw Error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID repository secrets; review files are preserved.');
  try {
    const response=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text:message,link_preview_options:{is_disabled:true}}),signal:AbortSignal.timeout(20000)});
    const result=await response.json();
    if(!response.ok || result.ok!==true) throw Error('Telegram send failed (HTTP '+response.status+')');
  } catch(error) {
    // Never log a request URL or response body containing credentials/chat metadata.
    throw Error(error.message.startsWith('Telegram send failed')?error.message:'Telegram connection failed');
  }
}
async function candidateCommit(files) {
  let ref=await api('/git/ref/heads/'+BRANCH,'GET',undefined,true);
  if (!ref) { const main=await api('/git/ref/heads/main'); ref=await api('/git/refs','POST',{ref:'refs/heads/'+BRANCH,sha:main.object.sha}); }
  const commit=await api('/git/commits/'+ref.object.sha);
  const tree=await api('/git/trees','POST',{base_tree:commit.tree.sha,tree:Object.entries(files).map(([file,content])=>({path:file,mode:'100644',type:'blob',content}))});
  const next=await api('/git/commits','POST',{message:'Prepare official MMA facility data update',tree:tree.sha,parents:[ref.object.sha]});
  await api('/git/refs/heads/'+BRANCH,'PATCH',{sha:next.sha,force:false});
}
async function reviewLink(summary) {
  const owner=repository.split('/')[0];
  const pulls=await api('/pulls?state=open&head='+encodeURIComponent(owner+':'+BRANCH)+'&base=main');
  if(pulls.length) return pulls[0].html_url;
  try {
    const pull=await api('/pulls','POST',{title:'예우시설·영외마트 데이터 업데이트 검토',head:BRANCH,base:'main',draft:true,body:summary+'\n\n자동 병합하지 않습니다. `updates/mma-changes.md`의 변경 내용을 확인하고 검토 완료 후 병합하세요.\n\n[병무청 원문](https://www.mma.go.kr/hall/listpart.do?mc=mma0003392)'});
    return pull.html_url;
  } catch {
    const url=repoUrl+'/compare/main...'+BRANCH+'?expand=1';
    console.warn('Automatic PR creation unavailable. Review/create PR: '+url);
    return url;
  }
}
async function run() {
  if (process.argv.includes('--test-telegram')) { await telegram('병역명문가 혜택 지도 Telegram 연결 확인: 예우시설·영외마트 월간 변경 알림을 받을 준비가 됐습니다.'); console.log('Telegram connection test delivered.'); return; }
  const beforeMma=JSON.parse(fs.readFileSync(path.join(ROOT,'dist/facilities.json'),'utf8'));
  const beforeMart=JSON.parse(fs.readFileSync(path.join(ROOT,'dist/marts.json'),'utf8'));
  const [afterMma,rawMart]=await Promise.all([fetchOfficial(),fetchMarts()]);
  const {data:afterMart}=await enrichMarts(rawMart,beforeMart,process.env.KAKAO_REST_API_KEY);
  for(const [label,before,after] of [['MMA',beforeMma,afterMma],['MND marts',beforeMart,afterMart]]) {
    if(after.facilities.length<before.facilities.length*.75)throw Error(label+' result dropped by more than 25%; manual source verification required.');
  }
  const mmaDiff=compare(beforeMma.facilities,afterMma.facilities),martDiff=compare(beforeMart.facilities,afterMart.facilities);
  const stats=diff=>({added:diff.added.length,removed:diff.removed.length,modified:diff.changed.length});
  const beforeRows=[...beforeMma.facilities,...beforeMart.facilities],afterRows=[...afterMma.facilities,...afterMart.facilities];
  const diff=compare(beforeRows,afterRows),changed=diff.added.length+diff.removed.length+diff.changed.length>0;
  const hash=fingerprint(afterRows);
  const reportText='# 두 공식 출처 월간 변경 검토\n\n## 병무청 예우시설\n\n'+report(beforeMma,afterMma,mmaDiff)+'\n\n## 국방부·국군복지단 영외마트\n\n원문: '+afterMart.source+'\n자료 기준: '+afterMart.sourceUpdatedAt+'\n\n'+report(beforeMart,afterMart,martDiff).replaceAll('병무청 예우시설','국방부 영외마트').replaceAll('https://www.mma.go.kr/hall/listpart.do?mc=mma0003392',afterMart.source).replaceAll('병무청 공식 출처','국방부 공식 출처');
  const summary=`병역명문가 지도 변경 확인\n예우시설: 추가 ${mmaDiff.added.length} · 삭제 ${mmaDiff.removed.length} · 변경 ${mmaDiff.changed.length}\n영외마트: 추가 ${martDiff.added.length} · 삭제 ${martDiff.removed.length} · 변경 ${martDiff.changed.length}`;
  fs.mkdirSync(OUTPUT,{recursive:true});
  fs.writeFileSync(path.join(OUTPUT,'summary.json'),JSON.stringify({checkedAt:afterMma.fetchedAt,changed,hash,sources:{mma:stats(mmaDiff),marts:stats(martDiff)}},null,2));
  fs.writeFileSync(path.join(OUTPUT,'changes.md'),reportText);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
  if(!changed){console.log('No changes in either official source. No Telegram notification.');return;}
  fs.writeFileSync(path.join(OUTPUT,'facilities.json'),JSON.stringify(afterMma));
  fs.writeFileSync(path.join(OUTPUT,'marts.json'),JSON.stringify(afterMart));
  console.log(summary);
  if(!process.argv.includes('--publish')){console.log('Read-only comparison complete. Candidates: .monitor-output/');return;}
  if(!process.env.GITHUB_TOKEN)throw Error('GITHUB_TOKEN is required for publishing review candidates');
  const [pendingMma,pendingMart,state]=await Promise.all([branchFile('dist/facilities.json'),branchFile('dist/marts.json'),branchFile('.monitor/state.json')]);
  const identical=pendingMma&&pendingMart&&fingerprint([...pendingMma.value.facilities,...pendingMart.value.facilities])===hash;
  if(identical&&state?.value.notifiedHash===hash){console.log('Same pending update already notified. No duplicate Telegram notification.');return;}
  if(!identical)await candidateCommit({'dist/facilities.json':JSON.stringify(afterMma),'dist/marts.json':JSON.stringify(afterMart),'updates/mma-changes.md':reportText,'.monitor/state.json':JSON.stringify({sourceHash:hash,notifiedHash:null})+'\n'});
  const review=await reviewLink(summary);
  await telegram(summary+'\n\n지도에는 아직 반영하지 않았습니다.\n변경 검토 및 업데이트: '+review+'\n\n확인: '+new Date(afterMma.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' (한국 시간)');
  const saved=await branchFile('.monitor/state.json');
  await api('/contents/.monitor/state.json','PUT',{message:'Record successful source change notification',branch:BRANCH,sha:saved?.sha,content:Buffer.from(JSON.stringify({sourceHash:hash,notifiedHash:hash})+'\n').toString('base64')});
  console.log('Review candidate prepared; Telegram sent: '+review);
}
run().catch(async error=>{
  console.error(error.message);
  if(process.argv.includes('--publish') && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID && !error.message.includes('Telegram')) {
    try { await telegram('병역명문가 데이터 확인 작업이 실패했습니다. 기존 지도 데이터는 유지됩니다.\n'+repoUrl+'/actions'); } catch { console.error('Failure notification could not be delivered.'); }
  }
  process.exitCode=1;
});