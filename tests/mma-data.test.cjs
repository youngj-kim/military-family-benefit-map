'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseOfficial,fingerprint,compare,report}=require('../scripts/mma-data.cjs');
const raw = id => ({mmgudgigwan_cd:id,udae_ggm:'시설 '+id,udjiyeok_cd:'09',udggeopjong_gbcd:'07',udae_gbcd:'02',udsangse_cn:'10% 할인',wido_vl:'37.5',gyeongdo_vl:'127.0'});
const snapshot = rows => parseOfficial('mmaCallback('+JSON.stringify({success:true,list:rows})+');','2026-10-16T00:00:00Z');
test('normalization preserves benefits and rejects invalid coordinates',()=>{
  const out=snapshot([{...raw('1'),udsangse_cn:'본인<br>가족 &amp; 동반',wido_vl:'0'}]);
  assert.equal(out.facilities[0].benefit,'본인\n가족 & 동반'); assert.equal(out.facilities[0].lat,null);
});
test('ordering, fetch timestamps and upstream unused metadata are not changes',()=>{
  const a=snapshot([raw('1'),raw('2')]), b=snapshot([{...raw('2'),todaydate:'changed'},raw('1')]);
  b.fetchedAt='later'; assert.equal(fingerprint(a.facilities),fingerprint(b.facilities));
  assert.deepEqual(compare(a.facilities,b.facilities),{added:[],removed:[],changed:[]});
});
test('facility additions, removals and benefit changes are reported by stable ID',()=>{
  const a=snapshot([raw('1'),raw('2')]), b=snapshot([{...raw('1'),udsangse_cn:'20% 할인'},raw('3')]);
  const diff=compare(a.facilities,b.facilities);
  assert.equal(diff.added[0].id,'3'); assert.equal(diff.removed[0].id,'2'); assert.deepEqual(diff.changed[0].fields,['benefit']);
  const text=report(a,b,diff); assert.match(text,/10% 할인 → 20% 할인/); assert.match(text,/추가 1건/);
});
test('failed, empty, duplicate and missing identity responses cannot overwrite data',()=>{
  for(const data of [{success:false,list:[raw('1')]},{success:true,list:[]},{success:true,list:[raw('1'),raw('1')]},{success:true,list:[raw('')]}]) assert.throws(()=>parseOfficial(JSON.stringify(data)));
  assert.throws(()=>parseOfficial('<html>maintenance</html>'));
});
test('change report escapes upstream HTML and Markdown links',()=>{
  const a=snapshot([raw('1')]), b=snapshot([{...raw('1'),udsangse_cn:'[click](https://example.invalid) <script>bad</script>'}]);
  const text=report(a,b,compare(a.facilities,b.facilities)); assert.ok(!text.includes('[click](')); assert.ok(!text.includes('<script>'));
});