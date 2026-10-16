'use strict';
const $ = id => document.getElementById(id);
const regions = {'09':'서울','08':'부산·울산','06':'대구·경북','05':'전남·광주','07':'대전·충남','02':'강원','14':'충북','12':'전북','04':'경남','13':'제주','10':'인천·경기','03':'경기북부','01':'강원영동','11':'전국 공통'};
const categories = ['공원','교육','궁능원/유적지','기념관/박물관','기타','문화','병원','숙박','스포츠/레저','은행','음식점','자연휴양림','관광지','주차장','장례시설','안경점','미용실','카페','여행사','전자제품','사진관','학원'];
const typeNames = {'01':'면제','02':'할인','03':'기타'};
const typeClass = type => type === '01' ? 'free' : type === '02' ? 'discount' : 'other';
let facilities = [], filtered = [], map = null, clusterer = null, info = null, markerById = new Map(), selected = null, limit = 60, userPosition = null, locationMarker = null, sdkLoading = false;
const el = (tag, text, className) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; };
function categoryName(row) { return categories[Number(row.category) - 1] || '기타'; }
function tags(row) { const t = el('div', undefined, 'tags'); t.append(el('span', typeNames[row.type] || '기타', 'tag ' + typeClass(row.type)), el('span', categoryName(row) + ' · ' + (row.area || regions[row.region] || '지역 미상'))); return t; }
function distance(row) { if (!userPosition || row.lat === null) return Infinity; const rad = n => n * Math.PI / 180; const a = Math.sin(rad(row.lat-userPosition.lat)/2)**2 + Math.cos(rad(userPosition.lat))*Math.cos(rad(row.lat))*Math.sin(rad(row.lng-userPosition.lng)/2)**2; return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
function filterRows() {
  const query = $('search').value.trim().toLocaleLowerCase('ko'), region = $('region').value, category = $('category').value, type = document.querySelector('input[name=type]:checked').value;
  const bounds = map && $('inbounds').checked ? map.getBounds() : null;
  filtered = facilities.filter(r => (!region || r.region === region) && (!category || r.category === category) && (!type || r.type === type) && (!query || [r.name,r.address,r.area,r.benefit,categoryName(r)].some(v => v.toLocaleLowerCase('ko').includes(query))) && (!bounds || (r.lat !== null && bounds.contain(new kakao.maps.LatLng(r.lat,r.lng)))));
  if (userPosition) filtered.sort((a,b) => distance(a)-distance(b));
  if (selected && !filtered.some(r => r.id === selected.id)) closeDetail();
  limit = 60; renderList(); renderMarkers();
}
function renderList() {
  $('count').textContent = `${filtered.length.toLocaleString('ko')}개 시설`;
  $('results').replaceChildren();
  if (!filtered.length) $('results').append(el('p','검색 결과가 없습니다. 지역·업종·검색어를 바꾸거나 지도 안에서 조건을 해제해 주세요.','empty'));
  const fragment = document.createDocumentFragment();
  filtered.slice(0,limit).forEach(r => {
    const button = el('button',undefined,'facility' + (selected?.id === r.id ? ' selected' : ''));
    button.dataset.id = r.id; button.setAttribute('aria-label',r.name + ' 상세 보기'); button.append(tags(r),el('h3',r.name),el('p',r.address || r.area || '주소 정보 없음'),el('p',r.benefit || '자세한 혜택은 시설에 문의해 주세요.','summary'));
    if (r.lat === null) button.append(el('span','위치 미등록 · 목록에서 혜택 확인 가능','unlocated'));
    else if (userPosition) button.append(el('span',`내 위치에서 직선 ${distance(r).toFixed(1)} km`,'unlocated'));
    button.addEventListener('click',() => selectFacility(r)); fragment.append(button);
  });
  $('results').append(fragment); $('more').hidden = limit >= filtered.length;
}
function renderMarkers() {
  if (!map) return;
  clusterer.clear(); markerById.clear();
  const markers = filtered.filter(r => r.lat !== null).map(r => {
    const color = r.type === '01' ? '#36714d' : r.type === '02' ? '#c18a31' : '#6b80a8';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36"><path d="M14 35C11 29 1 21 1 14a13 13 0 1 1 26 0c0 7-10 15-13 21" fill="${color}" stroke="white" stroke-width="2"/><circle cx="14" cy="14" r="4" fill="white"/></svg>`;
    const marker = new kakao.maps.Marker({position:new kakao.maps.LatLng(r.lat,r.lng),title:r.name,image:new kakao.maps.MarkerImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),new kakao.maps.Size(28,36),{offset:new kakao.maps.Point(14,36)})});
    kakao.maps.event.addListener(marker,'click',() => selectFacility(r)); markerById.set(r.id,marker); return marker;
  });
  clusterer.addMarkers(markers); $('map-status').textContent = `지도 표시 ${markers.length.toLocaleString('ko')}곳 · 위치 미등록 ${filtered.length-markers.length}곳`;
}
function link(text,url,className) { const a = el('a',text,className); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
function currentRouteUrl(row, position) {
  return `https://map.kakao.com/link/from/${encodeURIComponent('현재 위치')},${position.coords.latitude},${position.coords.longitude}/to/${encodeURIComponent(row.name)},${row.lat},${row.lng}`;
}
function startCurrentRoute(row, button, message) {
  if (!window.isSecureContext || !navigator.geolocation) {
    message.textContent = '현재 위치는 HTTPS 또는 localhost에서 사용할 수 있습니다. 아래 목적지 길찾기에서 출발지를 직접 선택해 주세요.';
    return;
  }
  button.disabled = true;
  button.textContent = '현재 위치 확인 중…';
  message.textContent = '';
  const restore = () => { button.disabled = false; button.textContent = '현위치에서 길찾기 ↗'; };
  navigator.geolocation.getCurrentPosition(position => {
    restore();
    if (!button.isConnected) return;
    message.textContent = '카카오맵으로 이동합니다…';
    window.location.assign(currentRouteUrl(row, position));
  }, error => {
    restore();
    if (!button.isConnected) return;
    message.textContent = error.code === 1
      ? '위치 권한이 허용되지 않았습니다. 권한을 허용하거나 아래 목적지 길찾기에서 출발지를 직접 선택해 주세요.'
      : '현재 위치를 확인하지 못했습니다. 다시 시도하거나 아래 목적지 길찾기를 이용해 주세요.';
  }, {enableHighAccuracy:true, timeout:10000, maximumAge:30000});
}
function closeDetail() { selected = null; $('detail').hidden = true; if (info) info.close(); document.querySelectorAll('.facility.selected').forEach(n => n.classList.remove('selected')); }
function selectFacility(r) {
  selected = r;
  document.querySelectorAll('.facility').forEach(n => n.classList.toggle('selected',n.dataset.id === r.id));
  const detail = $('detail'); detail.replaceChildren(); detail.hidden = false;
  const close = el('button','×','close'); close.setAttribute('aria-label','상세 닫기'); close.onclick = closeDetail;
  detail.append(close,tags(r),el('h2',r.name),el('h4','혜택 및 적용 조건'),el('p',r.benefit || '공식 상세 페이지 또는 시설에 문의해 주세요.'),el('h4','주소'),el('p',r.address || r.area || '주소 정보 없음'));
  if (r.phone) { detail.append(el('h4','연락처')); const phone = el('p'); const tel = el('a',r.phone); tel.href = 'tel:'+r.phone.replace(/[^0-9+]/g,''); phone.append(tel); detail.append(phone); }
  if (r.lat === null) detail.append(el('p','위치가 등록되지 않은 시설입니다. 주소와 지점을 확인한 뒤 카카오맵에서 검색해 주세요.','fine'));
  const actions = el('div',undefined,'detail-actions');
  const routeMessage = el('p', '', 'fine');
  routeMessage.setAttribute('role', 'status');
  if (r.lat !== null) {
    const route = el('button', '현위치에서 길찾기 ↗', 'primary');
    route.type = 'button';
    route.onclick = () => startCurrentRoute(r, route, routeMessage);
    actions.append(route, link('목적지 길찾기 ↗', `https://map.kakao.com/link/to/${encodeURIComponent(r.name)},${r.lat},${r.lng}`));
    detail.append(el('p', '현위치에서 길찾기를 누르면 위치 권한을 확인하고 현재 위치를 카카오맵에 전달합니다.', 'fine'));
  }
  actions.append(link('카카오맵 검색 ↗','https://map.kakao.com/link/search/'+encodeURIComponent(r.name+' '+r.area)),link('병무청 상세 ↗','https://www.mma.go.kr/hall/listdetail.do?mmgudgigwan_cd='+encodeURIComponent(r.id)));
  if (r.website) { const value = /^https?:\/\//i.test(r.website) ? r.website : 'https://'+r.website; try {const u = new URL(value); if (['https:','http:'].includes(u.protocol)) actions.append(link('시설 홈페이지 ↗',u.href));} catch {} }
  detail.append(actions,routeMessage,el('p','혜택은 변경될 수 있습니다. 방문 전 명문가증·신분증·가족관계서류 등 필요한 증빙과 적용 대상을 확인해 주세요.','fine'));
  if (matchMedia('(max-width: 760px)').matches) document.querySelector('.map-section').scrollIntoView({behavior:'smooth',block:'start'});
  if (map && r.lat !== null) { const pos = new kakao.maps.LatLng(r.lat,r.lng); if (map.getLevel()>5) map.setLevel(5); map.panTo(pos); const label = el('div',r.name); label.style.cssText='padding:8px 12px;font-size:12px;white-space:nowrap'; info.setContent(label); info.setPosition(pos); info.open(map); }
}
function fitResults() { if (!map) { openSettings(); return; } const rows = filtered.filter(r => r.lat !== null); if (!rows.length) { $('map-status').textContent = '검색 결과에 등록된 좌표가 없습니다.'; return; } const bounds = new kakao.maps.LatLngBounds(); rows.forEach(r => bounds.extend(new kakao.maps.LatLng(r.lat,r.lng))); map.setBounds(bounds,80,60,100,60); }
function openSettings() { $('origin').textContent = location.origin; $('key-dialog').showModal(); }
function mapFailure(message) { $('map-status').textContent = '지도 연결 확인 필요'; $('map-placeholder').hidden = false; $('placeholder-message').textContent = message; sdkLoading = false; }
function connectMap(key) {
  if (sdkLoading) return;
  if (!/^[a-f0-9]{32}$/i.test(key)) { mapFailure('올바른 카카오 JavaScript 키를 입력해 주세요.'); return; }
  if (map) { location.reload(); return; }
  sdkLoading = true; $('map-status').textContent = '카카오 지도 연결 중…';
  document.getElementById('kakao-sdk')?.remove();
  const script = document.createElement('script'); script.id = 'kakao-sdk'; script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services,clusterer&appkey='+encodeURIComponent(key);
  const timeout = setTimeout(() => { if (!map) mapFailure('지도 연결 시간이 초과되었습니다. 인터넷 연결과 JavaScript 키의 SDK 도메인 등록을 확인해 주세요.'); },15000);
  script.onerror = () => { clearTimeout(timeout); mapFailure('지도를 불러오지 못했습니다. 카카오맵 API 사용 설정, JavaScript 키와 SDK 도메인을 확인해 주세요.'); };
  script.onload = () => {
    if (!window.kakao?.maps?.load) { clearTimeout(timeout); mapFailure('카카오 지도 인증을 확인해 주세요. 지도 설정에서 키와 SDK 도메인을 확인할 수 있습니다.'); return; }
    kakao.maps.load(() => { try {
      map = new kakao.maps.Map($('map'),{center:new kakao.maps.LatLng(36.35,127.8),level:13});
      map.addControl(new kakao.maps.ZoomControl(),kakao.maps.ControlPosition.RIGHT);
      clusterer = new kakao.maps.MarkerClusterer({map,averageCenter:true,minLevel:7}); info = new kakao.maps.InfoWindow({removable:true});
      $('map-placeholder').hidden = true; sdkLoading = false; clearTimeout(timeout); $('inbounds').disabled = false;
      kakao.maps.event.addListener(map,'idle',() => { if ($('inbounds').checked) filterRows(); });
      new ResizeObserver(() => map.relayout()).observe($('map')); renderMarkers();
    } catch { clearTimeout(timeout); map = null; mapFailure('카카오 지도 초기화에 실패했습니다. API 사용 설정과 SDK 도메인을 확인해 주세요.'); } });
  };
  document.head.append(script);
}
async function boot() {
  Object.entries(regions).sort((a,b)=>a[1].localeCompare(b[1],'ko')).forEach(([v,t]) => $('region').add(new Option(t,v)));
  categories.forEach((t,i) => $('category').add(new Option(t,String(i+1).padStart(2,'0'))));
  $('inbounds').disabled = true;
  ['search','region','category','types','inbounds'].forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change',filterRows));
  $('more').onclick = () => { limit += 60; renderList(); };
  $('fit').onclick = fitResults; $('connect').onclick = openSettings; $('settings').onclick = openSettings;
  $('cancel-key').onclick = () => $('key-dialog').close();
  $('key-form').onsubmit = event => { event.preventDefault(); const key = $('key').value.trim(); $('key-dialog').close(); if (map) { $('key').value = ''; $('map-status').textContent = '지도가 이미 연결되어 있습니다. 키를 변경하려면 페이지를 새로고침해 주세요.'; return; } connectMap(key); $('key').value = ''; };
  $('reset').onclick = () => { $('search').value=''; $('region').value=''; $('category').value=''; document.querySelector('input[name=type][value=""]').checked=true; $('inbounds').checked=false; userPosition=null; if (locationMarker) locationMarker.setMap(null); $('locate').textContent='◎ 내 위치 기준'; closeDetail(); filterRows(); if (map) fitResults(); };
  $('locate').onclick = () => { if (!navigator.geolocation) { $('map-status').textContent='이 브라우저에서는 위치 기능을 지원하지 않습니다.'; return; } $('locate').disabled=true; $('map-status').textContent='현재 위치 확인 중…'; navigator.geolocation.getCurrentPosition(p => { userPosition={lat:p.coords.latitude,lng:p.coords.longitude}; $('locate').disabled=false; $('locate').textContent='◎ 가까운 순 정렬'; if(map) { const pos = new kakao.maps.LatLng(userPosition.lat,userPosition.lng); map.setLevel(6); map.panTo(pos); if(locationMarker) locationMarker.setMap(null); locationMarker = new kakao.maps.Marker({map,position:pos,title:'내 위치'}); } filterRows(); if(!map) $('map-status').textContent='내 위치에서 가까운 순으로 목록을 정렬했습니다.'; },() => { $('locate').disabled=false; $('map-status').textContent='위치를 확인하지 못했습니다. 위치 권한을 허용하거나 지역을 직접 선택해 주세요.'; },{timeout:10000,maximumAge:60000}); };
  try { const response = await fetch('facilities.json'); if (!response.ok) throw new Error('data'); const data = await response.json(); if (!Array.isArray(data.facilities)) throw new Error('schema'); facilities=data.facilities;
    $('data-note').textContent=`출처: 병무청 예우시설 ${facilities.length.toLocaleString('ko')}건 · 수집 ${new Date(data.fetchedAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})} 전국 공통 시설은 특정 지점의 좌표일 수 있습니다. 실시간 갱신 자료가 아닙니다.`;
    filterRows();
  } catch { $('count').textContent='시설 정보를 불러오지 못했습니다'; $('results').append(el('p','인터넷 연결을 확인하고 새로고침해 주세요.','empty')); }
  const key = window.BENEFIT_MAP_CONFIG?.kakaoJavascriptKey || ''; if (key) connectMap(key); else $('map-status').textContent='지도 연결 전 · 시설 목록 검색 가능';
}
boot();
