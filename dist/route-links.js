'use strict';
(function(root) {
  function naverRouteUrl(row) {
    const params=new URLSearchParams({elng:String(row.lng),elat:String(row.lat),etext:row.name,menu:'route',pathType:'0'});
    return 'https://map.naver.com/index.nhn?'+params.toString();
  }
  function addressSearchUrl(row, provider='kakao') {
    const address=String(row.address || '').trim();
    if(!address) return null;
    return (provider==='naver'?'https://map.naver.com/p/search/':'https://map.kakao.com/link/search/')+encodeURIComponent(address);
  }
  function destinationRouteUrl(row,provider='kakao') {
    if(!Number.isFinite(row.lat)||!Number.isFinite(row.lng))return addressSearchUrl(row,provider);
    return provider==='naver' ? naverRouteUrl(row) : 'https://map.kakao.com/link/to/'+encodeURIComponent(row.name)+','+row.lat+','+row.lng;
  }
  const api={naverRouteUrl,addressSearchUrl,destinationRouteUrl};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.BENEFIT_ROUTE_LINKS=api;
})(typeof window==='undefined'?globalThis:window);