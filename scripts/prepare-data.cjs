const fs = require('node:fs');
const path = require('node:path');
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/prepare-data.cjs <official JSONP file>');
const raw = fs.readFileSync(input, 'utf8').trim();
const data = JSON.parse(raw.startsWith('{') ? raw : raw.slice(raw.indexOf('(') + 1, raw.lastIndexOf(')')));
if (data.success !== true || !Array.isArray(data.list) || !data.list.length) throw new Error('Invalid MMA response');
const clean = v => String(v ?? '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
const rows = data.list.map(r => {
  const lat = Number(r.wido_vl), lng = Number(r.gyeongdo_vl);
  const located = lat >= 32 && lat <= 39.5 && lng >= 124 && lng <= 132;
  return {id: clean(r.mmgudgigwan_cd), name: clean(r.udae_ggm), region: clean(r.udjiyeok_cd), category: clean(r.udggeopjong_gbcd), type: clean(r.udae_gbcd), address: clean(r.addr), area: clean(r.displayaddr), benefit: clean(r.udsangse_cn), phone: clean(r.udgigwan_telno), website: clean(r.hmpg_addr), lat: located ? lat : null, lng: located ? lng : null};
});
if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('Duplicate facility IDs');
const out = {fetchedAt: new Date().toISOString(), source: 'https://www.mma.go.kr/hall/listpart.do?mc=mma0003392', endpoint: 'https://open.mma.go.kr/caisGGGS/bymmgPartAjaxJsonCall.json?udjiyeok_cd=&udggeopjong_gbcd=&callback=mmaCallback', facilities: rows};
fs.writeFileSync(path.join(__dirname, '../dist/facilities.json'), JSON.stringify(out));
console.log(JSON.stringify({total: rows.length, located: rows.filter(r => r.lat !== null).length, missingLocation: rows.filter(r => r.lat === null).length}));
