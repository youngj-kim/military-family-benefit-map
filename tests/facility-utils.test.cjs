const {test}=require('node:test');
const assert=require('node:assert/strict');
const {facilityKey,normalizeKey,readSaved,websiteUrl}=require('../dist/facility-utils.js');
test('canonical keys preserve old mart bookmarks and links without collisions',()=>{
  assert.equal(facilityKey({id:'mart:87',sourceKind:'mart'}),'mart:87');
  assert.equal(normalizeKey('mart:mart:87'),'mart:87');
  assert.deepEqual([...readSaved('["mart:mart:87","mart:87","12","mma:12",null]')],['mart:87','mma:12']);
  assert.notEqual(facilityKey({id:'87'}),facilityKey({id:'87',sourceKind:'mart'}));
});
test('website links add HTTPS and reject executable URLs and embedded credentials',()=>{
  assert.equal(websiteUrl('www.railpark.co.kr'),'https://www.railpark.co.kr/');
  assert.equal(websiteUrl('http://example.com/path'),'http://example.com/path');
  for(const value of ['javascript:alert(1)','data:text/html,test','https://user:pass@example.com',''])assert.equal(websiteUrl(value),null);
});
