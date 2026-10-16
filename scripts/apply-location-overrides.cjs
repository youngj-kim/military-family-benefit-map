'use strict';
const fs=require('node:fs');
const path=require('node:path');
function applyOverrides(data, supplemental) {
  let applied=0;
  const facilities=data.facilities.map(row=>{
    const o=supplemental.overrides?.[row.id];
    if(!o || o.originalAddress!==row.address || o.originalName!==row.name) return row;
    const correction=o.method==='verified-official-location-correction';
    const keyword=o.method==='kakao-keyword-exact-public-facility';
    if(correction ? row.lat!==o.originalLat || row.lng!==o.originalLng : row.lat!==null || row.lng!==null) return row;
    if(!(o.lat>=32&&o.lat<=39.5&&o.lng>=124&&o.lng<=132)) return row;
    applied++;
    return {...row,lat:o.lat,lng:o.lng,...((correction||keyword)?{address:o.address,originalAddress:row.address,originalLat:row.lat,originalLng:row.lng}:{}),coordinateSource:correction?'극장 공식 오시는 길 · 연결된 카카오 장소 확인':keyword?'카카오 장소 검색 · 시설명·관할 지역 완전 일치':'카카오 주소 검색 · 도로명 주소 완전 일치',...(keyword?{coordinatePlaceUrl:o.placeUrl}:{} ),coordinateCheckedAt:o.checkedAt};
  });
  return {data:{...data,facilities,locationSupplementedAt:supplemental.checkedAt},applied};
}
if(require.main===module) {
  const root=path.resolve(__dirname,'..'),file=path.join(root,'dist/facilities.json'),supplement=path.join(root,'data/location-overrides.json');
  if(!fs.existsSync(supplement)) { console.log('No supplemental coordinates. Official data retained.'); }
  else {
    const result=applyOverrides(JSON.parse(fs.readFileSync(file,'utf8')),JSON.parse(fs.readFileSync(supplement,'utf8')));
    fs.writeFileSync(file,JSON.stringify(result.data));
    console.log('Supplemental exact-address coordinates applied: '+result.applied);
  }
}
module.exports={applyOverrides};
