const {test}=require('node:test');
const assert=require('node:assert/strict');
const {candidateCommit}=require('../scripts/candidate-branch.cjs');
function fixture(existing,manual=false) {
  const calls=[];
  const api=async(route,method='GET',body)=>{
    calls.push({route,method,body});
    if(route==='/git/ref/heads/main')return {object:{sha:'main'}};
    if(route==='/git/ref/heads/bot')return existing?{object:{sha:'old'}}:null;
    if(route.startsWith('/compare/'))return {total_commits:1,commits:[{author:{login:manual?'human':'github-actions[bot]'}}],files:[{filename:'data.json'}]};
    if(route==='/git/commits/main')return {tree:{sha:'current-main-tree'}};
    if(route==='/git/trees')return {sha:'next-tree'};
    if(route==='/git/commits')return {sha:'next'};
    return {};
  };
  return {api,calls};
}
test('new and reused candidate branches always use current main tree without force',async()=>{
  for(const existing of [false,true]) {
    const {api,calls}=fixture(existing);await candidateCommit(api,'bot',{'data.json':'new'});
    assert.equal(calls.find(call=>call.route==='/git/trees').body.base_tree,'current-main-tree');
    assert.deepEqual(calls.find(call=>call.route==='/git/commits').body.parents,existing?['main','old']:['main']);
    assert.equal(calls.at(-1).body.force,existing?false:undefined);
  }
});
test('manual edits on a review branch stop automation without overwriting it',async()=>{
  const {api,calls}=fixture(true,true);await assert.rejects(candidateCommit(api,'bot',{'data.json':'new'}),/manual/);
  assert.ok(calls.every(call=>call.method==='GET'));
});
