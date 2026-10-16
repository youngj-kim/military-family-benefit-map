'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseSheet,snapshot}=require('../scripts/mart-data.cjs');
const {fingerprint,compare}=require('../scripts/mma-data.cjs');
const row={SEQ:'1',MART:'마트(영외)',LOC:'서울시 관악구 길 1',OP_WEEKDAY:'10:00~19:00',TEL:'02-000-0000',NOTE:'월요일 휴무',RN:'1'};
test('official IBSheet keys and trailing commas parse safely without eval',()=>{
  const data=parseSheet('{TOTAL:1,DATA:[{SEQ:"1",MART:"마트",LOC:"서울",NOTE:"text,ABC: value",},]}');assert.equal(data[0].NOTE,'text,ABC: value');
  assert.throws(()=>parseSheet('{TOTAL:1,DATA:[process.exit()]}'));
  assert.throws(()=>parseSheet('{TOTAL:2,DATA:[{SEQ:"1"}]}'));
});
test('mart source fields and update date are preserved without fabricated coordinates',()=>{
  const d=snapshot([row],'2026-04-28','2026-10-16T00:00:00Z');assert.deepEqual(d.facilities[0].original,row);assert.equal(d.sourceUpdatedAt,'2026-04-28');assert.equal(d.facilities[0].lat,null);assert.equal(d.facilities[0].id,'mart:1');
});
test('opening hours and closure notes trigger updates; row numbers do not',()=>{
  const a=snapshot([row],'2026-04-28'),b=snapshot([{...row,OP_WEEKDAY:'11:00~19:00',NOTE:'공사 휴점'}],'2026-04-28');
  assert.deepEqual(compare(a.facilities,b.facilities).changed[0].fields,['weekdayHours','notes']);
  assert.equal(fingerprint(a.facilities),fingerprint(snapshot([{...row,RN:'50'}],'2026-04-28').facilities));
});
test('missing names and duplicate mart identities fail validation',()=>{assert.throws(()=>snapshot([row,row],''));assert.throws(()=>snapshot([{...row,MART:''}],''));});