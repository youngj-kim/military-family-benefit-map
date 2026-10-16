'use strict';
const $ = id => document.getElementById(id);
const regions = {'09':'서울','08':'부산·울산','06':'대구·경북','05':'전남·광주','07':'대전·충남','02':'강원','14':'충북','12':'전북','04':'경남','13':'제주','10':'인천·경기','03':'경기북부','01':'강원영동','11':'전국 공통'};
const categories = ['공원','교육','궁능원/유적지','기념관/박물관','기타','문화','병원','숙박','스포츠/레저','은행','음식점','자연휴양림','관광지','주차장','장례시설','안경점','미용실','카페','여행사','전자제품','사진관','학원','영외마트'];
const typeNames = {'01':'면제','02':'할인','03':'기타','mart':'영외마트'};
const typeClass = type => type === 'mart' ? 'mart' : type === '01' ? 'free' : type === '02' ? 'discount' : 'other';
let datasetInfo = {};
let facilities = [], filtered = [], map = null, clusterer = null, info = null, markerById = new Map(), selected = null, limit = 60, userPosition = null, locationMarker = null, sdkLoading = false;
const el = (tag, text, className) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; };
function categoryName(row) { return categories[Number(row.category) - 1] || '기타'; }
function tags(row) { const t = el('div', undefined, 'tags'); const icon = el('span', undefined, 'category-symbol'); icon.innerHTML = window.benefitCategorySvg(row.category); t.append(icon,el('span', typeNames[row.type] || '기타', 'tag ' + typeClass(row.type)), el('span', categoryName(row) + ' · ' + (row.area || regions[row.region] || '지역 미상'))); return t; }
function distance(row) { if (!userPosition || row.lat === null) return Infinity; const rad = n => n * Math.PI / 180; const a = Math.sin(rad(row.lat-userPosition.lat)/2)**2 + Math.cos(rad(userPosition.lat))*Math.cos(rad(row.lat))*Math.sin(rad(row.lng-userPosition.lng)/2)**2; return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
function filterRows() {
  const query = $('search').value.trim().toLocaleLowerCase('ko'), region = $('region').value, category = $('category').value, type = document.querySelector('input[name=type]:checked').value;
  const source = document.querySelector('input[name=dataset]:checked').value;
  const selectedType = source === 'mart' ? '' : type;
  $('types').disabled = source === 'mart'; $('category').disabled = source === 'mart';
  updateSourceNotes(source);
  const bounds = map && $('inbounds').checked ? map.getBounds() : null;
  filtered = facilities.filter(r => (source === 'all' || (r.sourceKind || 'mma') === source) && (!region || r.region === region) && (!category || r.category === category) && (!selectedType || r.type === selectedType) && (!query || [r.name,r.address,r.area,r.benefit,categoryName(r)].some(v => v.toLocaleLowerCase('ko').includes(query))) && (!bounds || (r.lat !== null && bounds.contain(new kakao.maps.LatLng(r.lat,r.lng)))));
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
    if (r.lat === null) button.append(el('span',r.sourceKind === 'mart' ? '좌표 미확인 · 지도 이동·길찾기 불가' : '위치 미등록 · 목록에서 혜택 확인 가능','unlocated'));
    else if (r.sourceKind === 'mart') button.append(el('span','주소 기반 위치 · 실제 입구는 확인 필요','unlocated'));
    else if (userPosition) button.append(el('span',`내 위치에서 직선 ${distance(r).toFixed(1)} km`,'unlocated'));
    button.addEventListener('click',() => selectFacility(r)); fragment.append(button);
  });
  $('results').append(fragment); $('more').hidden = limit >= filtered.length;
}
function renderMarkers() {
  if (!map) return;
  clusterer.clear(); markerById.clear();
  const markers = filtered.filter(r => r.lat !== null).map(r => {
    const color = r.type === 'mart' ? '#6d4c96' : r.type === '01' ? '#36714d' : r.type === '02' ? '#c18a31' : '#6b80a8';
    const shape = window.BENEFIT_CATEGORY_ICONS[r.category] || window.BENEFIT_CATEGORY_ICONS['05'];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44"><path d="M17 42C13 34 1 26 1 17a16 16 0 1 1 32 0c0 9-12 17-16 25" fill="${color}" stroke="white" stroke-width="2"/><g transform="translate(6 5) scale(.92)" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>`;
    const marker = new kakao.maps.Marker({position:new kakao.maps.LatLng(r.lat,r.lng),title:r.name,image:new kakao.maps.MarkerImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),new kakao.maps.Size(34,44),{offset:new kakao.maps.Point(17,44)})});
    kakao.maps.event.addListener(marker,'click',() => selectFacility(r)); markerById.set(r.id,marker); return marker;
  });
  clusterer.addMarkers(markers); $('map-status').textContent = `지도 표시 ${markers.length.toLocaleString('ko')}곳 · 위치 미등록 ${filtered.length-markers.length}곳`;
}
function link(text,url,className) { const a = el('a',text,className); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
function currentRouteUrl(row, position) {
  return `https://map.kakao.com/link/from/${encodeURIComponent('현재 위치')},${position.coords.latitude},${position.coords.longitude}/to/${encodeURIComponent(row.name)},${row.lat},${row.lng}`;
}
function startCurrentRoute(row, button, message, provider = 'kakao') {
  const originalLabel = button.textContent;
  if (!window.isSecureContext || !navigator.geolocation) {
    message.textContent = '현재 위치는 HTTPS 또는 localhost에서 사용할 수 있습니다. 위치 권한과 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
    return;
  }
  const routeWindow = window.open('about:blank', '_blank');
  if (!routeWindow) {
    message.textContent = '새 탭을 열지 못했습니다. 이 사이트의 팝업을 허용한 뒤 다시 눌러 주세요.';
    return;
  }
  routeWindow.opener = null;
  button.disabled = true;
  button.textContent = '현재 위치 확인 중…';
  message.textContent = '';
  const restore = () => { button.disabled = false; button.textContent = originalLabel; };
  navigator.geolocation.getCurrentPosition(position => {
    restore();
    if (!button.isConnected || routeWindow.closed) { routeWindow.close(); return; }
    message.textContent = provider === 'naver' ? '네이버 지도로 이동합니다…' : '카카오맵으로 이동합니다…';
    routeWindow.location.replace(provider === 'naver' ? window.BENEFIT_ROUTE_LINKS.naverRouteUrl(row, position) : currentRouteUrl(row, position));
  }, error => {
    routeWindow.close();
    restore();
    if (!button.isConnected) return;
    message.textContent = error.code === 1
      ? '위치 권한이 허용되지 않았습니다. 권한을 허용하거나 위치 권한과 인터넷 연결을 확인한 뒤 다시 시도해 주세요.'
      : '현재 위치를 확인하지 못했습니다. 위치 권한과 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
  }, {enableHighAccuracy:true, timeout:10000, maximumAge:30000});
}
function closeDetail() { selected = null; $('detail').hidden = true; if (info) info.close(); document.querySelectorAll('.facility.selected').forEach(n => n.classList.remove('selected')); }
function selectFacility(r) {
  selected = r;
  if (info) info.close();
  if (map && r.lat === null) $('map-status').textContent = r.name + ': 좌표 미확인으로 지도 이동·길찾기를 사용할 수 없습니다.';
  document.querySelectorAll('.facility').forEach(n => n.classList.toggle('selected',n.dataset.id === r.id));
  const detail = $('detail'); detail.replaceChildren(); detail.hidden = false;
  const close = el('button','×','close'); close.setAttribute('aria-label','상세 닫기'); close.onclick = closeDetail;
  detail.append(close,tags(r),el('h2',r.name),el('h4','혜택 및 적용 조건'),el('p',r.benefit || '공식 상세 페이지 또는 시설에 문의해 주세요.'),el('h4','주소'),el('p',r.address || r.area || '주소 정보 없음'));
  if (r.sourceKind === 'mart') {
    detail.append(el('h4','운영정보 · 원본 자료 기준'),el('p',`평일: ${r.weekdayHours || '원문 미기재'}
토요일: ${r.saturdayHours || '원문 미기재'}
일요일: ${r.sundayHours || '원문 미기재'}`),el('h4','점심시간'),el('p',`평일: ${r.weekdayLunch || '원문 미기재'}
토요일: ${r.saturdayLunch || '원문 미기재'}
일요일: ${r.sundayLunch || '원문 미기재'}`));
    if (r.notes) detail.append(el('h4','휴점·분리운영 등 유의사항'),el('p',r.notes));
    detail.append(el('p','국방부 공식 영외마트 목록입니다. 병역명문가 이용 자격·동반 범위·증빙과 임시 휴무는 국군복지포털 또는 매장에 확인해 주세요. 원문 미기재는 휴무 확정을 뜻하지 않습니다.','fine'));
    if (r.lat !== null) detail.append(el('p','지도 위치는 원문 주소를 카카오 REST API로 별도 조회한 결과입니다. 공식 제공 좌표가 아니며 입구·이전 여부는 별도 확인이 필요합니다.','fine'));
  }
  if (r.phone) { detail.append(el('h4','연락처')); const phone = el('p'); const tel = el('a',r.phone); tel.href = 'tel:'+r.phone.replace(/[^0-9+]/g,''); phone.append(tel); detail.append(phone); }
  if (r.lat === null) detail.append(el('p','위치가 등록되지 않은 시설입니다. 원문 주소와 지점을 확인해 주세요.','fine'));
  const actions = el('div',undefined,'detail-actions');
  const routeMessage = el('p', '', 'fine');
  routeMessage.setAttribute('role', 'status');
  const route = el('button', '카카오 현위치 길찾기 ↗', 'primary');
  const naverRoute = el('button', '네이버 현위치 길찾기 ↗', 'primary naver-route');
  for (const button of [route,naverRoute]) { button.type='button'; button.disabled=r.lat===null; }
  route.onclick = () => startCurrentRoute(r, route, routeMessage);
  naverRoute.onclick = () => startCurrentRoute(r, naverRoute, routeMessage, 'naver');
  actions.append(route,naverRoute);
  detail.append(el('p', r.lat===null ? '위치 좌표가 확인되지 않아 현위치 길찾기를 사용할 수 없습니다. 주소와 공식 원문을 확인해 주세요.' : '현위치 길찾기를 누르면 위치 권한을 확인하고 현재 위치를 선택한 지도 서비스에 전달합니다.', 'fine'));
  const source = el('p',undefined,'fine source-detail');
  source.append(el('span','출처: '),r.sourceKind === 'mart' ? link('국방부 영외마트 원문',datasetInfo.mart.source) : link('병무청 시설 원문','https://www.mma.go.kr/hall/listdetail.do?mmgudgigwan_cd='+encodeURIComponent(r.id)));
  if(r.sourceKind === 'mart')source.append(el('span',' · '),link('국군복지포털 이용 안내','https://www.welfare.mil.kr/'));
  detail.append(source);
  detail.append(actions,routeMessage,el('p','혜택은 변경될 수 있습니다. 방문 전 명문가증·신분증·가족관계서류 등 필요한 증빙과 적용 대상을 확인해 주세요.','fine'));
  if (matchMedia('(max-width: 760px)').matches) detail.scrollIntoView({behavior:'smooth',block:'start'});
  if (map && r.lat !== null) { const pos = new kakao.maps.LatLng(r.lat,r.lng); if (map.getLevel()>5) map.setLevel(5); map.panTo(pos); const label = el('div',r.name); label.style.cssText='padding:8px 12px;font-size:12px;white-space:nowrap'; info.setContent(label); info.setPosition(pos); info.open(map); }
}
function fitResults() { if (!map) { $('map-status').textContent = '지도 연결 후 이용할 수 있습니다. 시설 목록은 계속 검색할 수 있습니다.'; return; } const rows = filtered.filter(r => r.lat !== null); if (!rows.length) { $('map-status').textContent = '검색 결과에 등록된 좌표가 없습니다.'; return; } const bounds = new kakao.maps.LatLngBounds(); rows.forEach(r => bounds.extend(new kakao.maps.LatLng(r.lat,r.lng))); map.setBounds(bounds,80,60,100,60); }
function mapFailure(message) { $('map-status').textContent = '지도 연결 확인 필요'; $('map-placeholder').hidden = false; $('placeholder-message').textContent = message; sdkLoading = false; }
function connectMap(key) {
  if (sdkLoading) return;
  if (!/^[a-f0-9]{32}$/i.test(key)) { mapFailure('지도 연결을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.'); return; }
  if (map) { location.reload(); return; }
  sdkLoading = true; $('map-status').textContent = '카카오 지도 연결 중…';
  document.getElementById('kakao-sdk')?.remove();
  const script = document.createElement('script'); script.id = 'kakao-sdk'; script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services,clusterer&appkey='+encodeURIComponent(key);
  const timeout = setTimeout(() => { if (!map) mapFailure('지도 연결 시간이 초과되었습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.'); },15000);
  script.onerror = () => { clearTimeout(timeout); mapFailure('지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. 시설 목록과 길찾기는 계속 이용할 수 있습니다.'); };
  script.onload = () => {
    if (!window.kakao?.maps?.load) { clearTimeout(timeout); mapFailure('지도 연결이 일시적으로 제한되었습니다. 잠시 후 다시 시도해 주세요.'); return; }
    kakao.maps.load(() => { try {
      map = new kakao.maps.Map($('map'),{center:new kakao.maps.LatLng(36.35,127.8),level:13});
      map.addControl(new kakao.maps.ZoomControl(),kakao.maps.ControlPosition.RIGHT);
      clusterer = new kakao.maps.MarkerClusterer({map,averageCenter:true,minLevel:7}); info = new kakao.maps.InfoWindow({removable:true});
      $('map-placeholder').hidden = true; sdkLoading = false; clearTimeout(timeout); $('inbounds').disabled = false;
      kakao.maps.event.addListener(map,'idle',() => { if ($('inbounds').checked) filterRows(); });
      new ResizeObserver(() => map.relayout()).observe($('map')); renderMarkers();
    } catch { clearTimeout(timeout); map = null; mapFailure('지도를 준비하지 못했습니다. 페이지를 새로고침해 주세요.'); } });
  };
  document.head.append(script);
}
function updateSourceNotes(source) {
  const date = value => { const d=new Date(value);return Number.isNaN(d.getTime())?'정보 없음':d.toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}); };
  const mma=datasetInfo.mma,mart=datasetInfo.mart;
  const martNote=$('mart-location-note');martNote.hidden=source==='mma';
  martNote.textContent='영외마트 위치는 원문 주소 기반 조회 결과입니다. 방문 전 입구·이전·휴무 여부를 확인해 주세요.';
  const parts=[];
  if(source!=='mart' && mma)parts.push('예우시설 '+date(mma.fetchedAt));
  if(source!=='mma' && mart)parts.push('영외마트 '+date(mart.sourceUpdatedAt));
  $('map-updated').textContent='데이터 최종 업데이트: '+(parts.join(' · ')||'정보 없음');
  $('data-note').textContent=source==='mma' ? `출처: 병무청 예우시설 ${mma?.facilities.length || 0}건. 전국 공통 시설은 특정 지점의 좌표일 수 있습니다.` : source==='mart' ? `출처: 국방부·국군복지단 공식 영외마트 ${mart?.facilities.length || 0}곳 · 자료 기준 ${date(mart?.sourceUpdatedAt)}. 실시간 운영정보가 아닙니다. 지도 위치는 카카오 REST API로 별도 수집한 주소 기반 좌표입니다.` : '출처: 병무청 예우시설 / 국방부·국군복지단 영외마트. 출처별 자료 기준일이 다르며 방문 전 운영 여부를 확인하세요.';
}
async function boot() {
  Object.entries(regions).sort((a,b)=>a[1].localeCompare(b[1],'ko')).forEach(([v,t]) => $('region').add(new Option(t,v)));
  categories.forEach((t,i) => $('category').add(new Option(t,String(i+1).padStart(2,'0'))));
  $('inbounds').disabled = true;
  ['search','region','category','types','inbounds','datasets'].forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change',filterRows));
  $('category').addEventListener('change', () => { if($('category').value === '23')document.querySelector('input[name=dataset][value=all]').checked=true; filterRows(); });
  $('datasets').addEventListener('change', () => { $('category').value = ''; document.querySelector('input[name=type][value=""]').checked = true; filterRows(); });
  $('more').onclick = () => { limit += 60; renderList(); };
  $('fit').onclick = fitResults; $('retry-map').onclick = () => location.reload();
  $('reset').onclick = () => { document.querySelector('input[name=dataset][value=mma]').checked=true; $('search').value=''; $('region').value=''; $('category').value=''; document.querySelector('input[name=type][value=""]').checked=true; $('inbounds').checked=false; userPosition=null; if (locationMarker) locationMarker.setMap(null); $('locate').textContent='◎ 내 위치 기준'; closeDetail(); filterRows(); if (map) fitResults(); };
  $('locate').onclick = () => { if (!navigator.geolocation) { $('map-status').textContent='이 브라우저에서는 위치 기능을 지원하지 않습니다.'; return; } $('locate').disabled=true; $('map-status').textContent='현재 위치 확인 중…'; navigator.geolocation.getCurrentPosition(p => { userPosition={lat:p.coords.latitude,lng:p.coords.longitude}; $('locate').disabled=false; $('locate').textContent='◎ 가까운 순 정렬'; if(map) { const pos = new kakao.maps.LatLng(userPosition.lat,userPosition.lng); map.setLevel(6); map.panTo(pos); if(locationMarker) locationMarker.setMap(null); locationMarker = new kakao.maps.Marker({map,position:pos,title:'내 위치'}); } filterRows(); if(!map) $('map-status').textContent='내 위치에서 가까운 순으로 목록을 정렬했습니다.'; },() => { $('locate').disabled=false; $('map-status').textContent='위치를 확인하지 못했습니다. 위치 권한을 허용하거나 지역을 직접 선택해 주세요.'; },{timeout:10000,maximumAge:60000}); };
  const load = async file => { const response=await fetch(file); if(!response.ok) throw Error('data');const data=await response.json();if(!Array.isArray(data.facilities))throw Error('schema');return data; };
  const sources=await Promise.allSettled([load('facilities.json'),load('marts.json')]);
  sources.forEach((result,index)=>{if(result.status==='fulfilled'){const key=index===0?'mma':'mart';datasetInfo[key]=result.value;facilities.push(...result.value.facilities.map(row=>row.sourceKind === 'mart' ? {...row,lat:row.geocodedLat??null,lng:row.geocodedLng??null} : row));}});
  if(!facilities.length) { $('count').textContent='시설 정보를 불러오지 못했습니다';$('map-updated').textContent='데이터 최종 업데이트: 확인 불가'; }
  else { if(!datasetInfo.mma)document.querySelector('input[name=dataset][value=mart]').checked=true; filterRows(); }
  const key = window.BENEFIT_MAP_CONFIG?.kakaoJavascriptKey || ''; if (key) connectMap(key); else mapFailure('지도를 준비하지 못했습니다. 시설 목록에서 혜택과 길찾기를 이용해 주세요.');
}
boot();
