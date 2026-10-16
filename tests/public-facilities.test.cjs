'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {publicFacility,selectPublicPlace}=require('../scripts/geocode-public-facilities.cjs');
const row={name:'인천광역시 동구 보건소'};
const doc={id:'123',place_name:'동구보건소',road_address_name:'인천 동구 석수로 90',x:'126.65',y:'37.47'};
test('unique exact health center name and jurisdiction is accepted',()=>assert.equal(selectPublicPlace(row,[doc]).status,'matched'));
test('same facility name in a different jurisdiction is rejected',()=>assert.equal(selectPublicPlace(row,[{...doc,road_address_name:'대구 동구 동촌로 79'}]).status,'review'));
test('health center annex and multiple matches are not silently selected',()=>{
 assert.equal(selectPublicPlace(row,[{...doc,place_name:'동구보건소 예방접종실'}]).status,'review');
 assert.equal(selectPublicPlace(row,[doc,{...doc,id:'456'}]).status,'review');
 assert.equal(selectPublicPlace(row,[doc],false).status,'review');
});
test('grouped centers are excluded while individually named centers are eligible',()=>{
 assert.equal(publicFacility({name:'인천광역시 미추홀구 주민자치센터'}),null);
 assert.equal(publicFacility({name:'가평군 주민자치센터'}),null);
 assert.equal(publicFacility({name:'인천광역시 미추홀구 주안1동 행정복지센터'}).kind,'행정복지센터');
});
