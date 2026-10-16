'use strict';
(function(root) {
  function naverRouteUrl(row, position) {
    const params=new URLSearchParams({elng:String(row.lng),elat:String(row.lat),etext:row.name,menu:'route',pathType:'0'});
    if(position) { params.set('slng',String(position.coords.longitude)); params.set('slat',String(position.coords.latitude)); params.set('stext','현재 위치'); }
    return 'https://map.naver.com/index.nhn?'+params.toString();
  }
  const api={naverRouteUrl};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.BENEFIT_ROUTE_LINKS=api;
})(typeof window==='undefined'?globalThis:window);