'use strict';
function appendHistory(history, report, id) {
  if (history.some(entry => entry.id === id)) return history;
  const counts = [...report.matchAll(/추가 (\d+)건 · 삭제 (\d+)건 · 변경 (\d+)건/g)].map(m => ({added:+m[1],removed:+m[2],modified:+m[3]}));
  if (counts.length !== 2) throw Error('Invalid update report counts');
  return [{id, checkedAt:id, sources:{mma:counts[0],marts:counts[1]}, report:report.replace(/^이 후보는 자동 배포하지 않습니다\..*$/gm, '').trim()}, ...history];
}
module.exports = {appendHistory};
