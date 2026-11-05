'use strict';
(() => {
  const button = document.getElementById('show-updates');
  const dialog = document.getElementById('update-dialog');
  const content = document.getElementById('update-history-content');
  const key = 'benefit-map-seen-update';
  let latestId;
  function open() { if (!dialog.open) dialog.showModal(); seen(); button.classList.remove('has-update'); }
  function seen() { if (latestId) { try { localStorage.setItem(key, latestId); } catch {} } }
  button.addEventListener('click', open);
  document.getElementById('close-updates').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', seen);
  function textNode(tag, value, parent) { const node = document.createElement(tag); node.textContent = value; parent.append(node); return node; }
  function renderReport(report, parent) {
    for (const raw of report.split('\n')) {
      const line = raw.replace(/\\([\\`*_{}\[\]()#+!|])/g, '$1').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
      if (!line.trim() || /^# |^확인 시각:|^기준 데이터:|^이 후보는/.test(line)) continue;
      if (/^\[.*\]\(https?:/.test(line) || /^원문: https?:/.test(line)) continue;
      const heading = line.match(/^(#{2,3}) (.*)/);
      textNode(heading ? (heading[1].length === 2 ? 'h4' : 'h5') : 'p', heading ? heading[2] : line.replace(/^- /, '• '), parent);
    }
  }
  fetch('update-history.json', {cache:'no-cache'}).then(r => { if (!r.ok) throw Error('history'); return r.json(); }).then(entries => {
    content.replaceChildren();
    if (!Array.isArray(entries) || !entries.length) { textNode('p', '아직 등록된 업데이트 내역이 없습니다.', content); return; }
    latestId = entries[0].id;
    for (const [i, entry] of entries.entries()) {
      const section = document.createElement('details'); section.open = i === 0;
      const date = new Date(entry.checkedAt).toLocaleDateString('ko-KR', {timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'});
      textNode('summary', date + ' 데이터 업데이트', section);
      for (const [source, label] of [['mma','예우시설'],['marts','영외마트']]) {
        const s = entry.sources[source]; textNode('p', `${label}: 추가 ${s.added} · 삭제 ${s.removed} · 변경 ${s.modified}`, section).className = 'update-counts';
      }
      const details = document.createElement('details'); textNode('summary', '시설별 전체 변경 내역', details);
      renderReport(entry.report, details); section.append(details); content.append(section);
    }
    let previous; try { previous = localStorage.getItem(key); } catch {}
    if (previous !== latestId) button.classList.add('has-update');
  }).catch(() => { content.replaceChildren(); textNode('p', '업데이트 기록을 불러오지 못했습니다. 잠시 후 페이지를 새로고침해 주세요.', content); });
})();
