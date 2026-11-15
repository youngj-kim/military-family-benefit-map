const {test}=require('node:test'),assert=require('node:assert/strict');
const {addressMatches,selectPlace}=require('../scripts/geocode-named-addresses.cjs');
test('address comparison preserves numbered roads and accepts explicitly concatenated floor information',()=>{
 assert.ok(addressMatches('대구광역시중구중앙대로66길 20(남산동)','대구 중구 중앙대로66길 20'));
 assert.ok(addressMatches('인천광역시부평구시장로 322층, 3층층 (부평동)','인천 부평구 시장로 32'));
 assert.ok(!addressMatches('인천광역시부평구시장로 322','인천 부평구 시장로 32'));
 assert.ok(!addressMatches('대구광역시중구중앙대로66길 20','대구 중구 중앙대로 66'));
});
test('conflicting coordinates cannot be selected automatically',()=>{
 const row={address:'대구 중구 중앙대로66길 20'};
 const place={road_address_name:row.address,x:'128.6',y:'35.8'};
 assert.equal(selectPlace(row,[place,{...place,x:'128.7'}]).status,'review');
 assert.equal(selectPlace(row,[place,place]).status,'matched');
});
