'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {applyOverrides}=require('../scripts/apply-location-overrides.cjs');
const saved=require('../data/location-overrides.json').overrides['3544'];
const row={id:'3544',name:saved.originalName,address:saved.originalAddress,lat:saved.originalLat,lng:saved.originalLng};
test('verified location error is corrected without mutating original dataset',()=>{
 const result=applyOverrides({facilities:[row]},{overrides:{3544:saved}});
 assert.equal(result.applied,1);assert.equal(row.lng,124.002864);
 assert.equal(result.data.facilities[0].lng,saved.lng);
 assert.equal(result.data.facilities[0].address,saved.address);
 assert.equal(result.data.facilities[0].originalAddress,row.address);
});
test('correction becomes stale when official address or coordinates change',()=>{
 for(const changed of [{...row,lng:127.003},{...row,address:'변경 주소'}]){
  assert.equal(applyOverrides({facilities:[changed]},{overrides:{3544:saved}}).applied,0);
 }
});
test('ordinary supplements cannot overwrite an existing official coordinate',()=>{
 const supplement={...saved,method:'kakao-road-address-exact'};
 assert.equal(applyOverrides({facilities:[row]},{overrides:{3544:supplement}}).applied,0);
 assert.equal(applyOverrides({facilities:[{...row,lat:null,lng:null}]},{overrides:{3544:supplement}}).applied,1);
});
