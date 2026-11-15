'use strict';
(function(root) {
  function naverRouteUrl(row,origin) {
    const params=new URLSearchParams({elng:String(row.lng),elat:String(row.lat),etext:row.name,menu:'route',pathType:'0'});
    if(origin){params.set('slat',String(origin.lat));params.set('slng',String(origin.lng));params.set('stext','현재 위치');}
    return 'https://map.naver.com/index.nhn?'+params.toString();
  }
  function addressSearchUrl(row, provider='kakao') {
    const address=String(row.address || '').trim();
    if(!address) return null;
    return (provider==='naver'?'https://map.naver.com/p/search/':'https://map.kakao.com/link/search/')+encodeURIComponent(address);
  }
  function destinationRouteUrl(row,provider='kakao',origin) {
    if(!Number.isFinite(row.lat)||!Number.isFinite(row.lng))return addressSearchUrl(row,provider);
    const start=origin&&Number.isFinite(origin.lat)&&Number.isFinite(origin.lng)?origin:null;
    if(provider==='naver')return naverRouteUrl(row,start);
    if(start)return 'https://map.kakao.com/link/by/car/'+encodeURIComponent('현재 위치')+','+start.lat+','+start.lng+'/'+encodeURIComponent(row.name)+','+row.lat+','+row.lng;
    return 'https://map.kakao.com/link/to/'+encodeURIComponent(row.name)+','+row.lat+','+row.lng;
  }
  const api={naverRouteUrl,addressSearchUrl,destinationRouteUrl};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.BENEFIT_ROUTE_LINKS=api;
})(typeof window==='undefined'?globalThis:window);
