'use strict';
// Static SVG geometry; facility data is never inserted into SVG markup.
window.BENEFIT_CATEGORY_ICONS = Object.freeze({
  '01': '<path d="M12 2 5 12h4l-4 5h6v5m1-20 7 10h-4l4 5h-7"/>',
  '02': '<path d="m2 8 10-5 10 5-10 5L2 8Zm4 3v6c4 3 8 3 12 0v-6m4-3v9"/>',
  '03': '<path d="m3 8 9-5 9 5M2 10h20M4 10v10m5-10v10m6-10v10m5-10v10M2 21h20"/>',
  '04': '<path d="m2 7 10-5 10 5H2Zm2 3v9m5-9v9m6-9v9m5-9v9M2 22h20M3 19h18"/>',
  '05': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  '06': '<path d="M3 4h18v8c0 6-5 9-9 10-4-1-9-4-9-10V4Z"/><path d="m6 8 3 1m6 0 3-1M8 15q4 4 8 0"/>',
  '07': '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
  '08': '<path d="M3 5v16m18-10v10M3 17h18M3 11h18v6M7 7h4v4H7V7Zm6 4V7h5a3 3 0 0 1 3 3v1"/>',
  '09': '<path d="m5 3 16 18M4 4l4-1 13 13v5h-5L3 8l1-4Z"/><path d="m4 12 8-8m-3 13 8-8m-5 11 8-8M3 21l4-4"/>',
  '10': '<path d="m2 7 10-5 10 5H2Zm2 3v9m5-9v9m6-9v9m5-9v9M2 22h20M3 19h18"/><path d="M12 4v1"/>',
  '11': '<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18m11-18c-5 4-5 10 0 10V3Zm0 10v8"/>',
  '12': '<path d="m7 3-5 10h4l-4 5h10l-4-5h4L7 3Zm10 1-4 8h3l-3 5h9l-4-5h3l-4-8ZM7 18v4m10-5v5"/>',
  '13': '<path d="m2 20 7-13 4 7 3-5 6 11H2Zm4-7 3 2 2-1"/><circle cx="18" cy="4" r="2"/>',
  '14': '<rect x="3" y="2" width="18" height="20" rx="2"/><path d="M9 18V6h4a4 4 0 0 1 0 8H9"/>',
  '15': '<path d="M3 21V9l9-7 9 7v12H3Zm6 0v-7h6v7M12 5v6m-3-3h6"/>',
  '16': '<circle cx="6" cy="14" r="4"/><circle cx="18" cy="14" r="4"/><path d="M10 14h4M2 13l2-8h3m15 8-2-8h-3"/>',
  '17': '<circle cx="5" cy="6" r="3"/><circle cx="5" cy="18" r="3"/><path d="m7 8 14 13M7 16 21 3"/>',
  '18': '<path d="M3 8h13v7a6 6 0 0 1-12 0V8Zm13 1h3a3 3 0 0 1 0 6h-3M2 22h18M6 2v3m5-3v3"/>',
  '19': '<path d="m2 12 8 2 6 7 2-1-3-8 6-7c2-3-1-4-3-2l-7 6-8-3-1 2 7 6-7-2Z"/>',
  '20': '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 22h8m-4-5v5m-5-5h10"/>',
  '21': '<path d="M2 8h5l2-4h6l2 4h5v13H2V8Z"/><circle cx="12" cy="14" r="4"/>',
  '23': '<path d="M2 3h3l3 13h11l3-9H6M9 20h1m7 0h1"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
  '22': '<path d="M3 3h18v14H3V3Zm9 14v5m-5 0h10M7 8h10m-10 4h6"/>'
});
window.benefitCategorySvg = function(code) {
  const shape = window.BENEFIT_CATEGORY_ICONS[code] || window.BENEFIT_CATEGORY_ICONS['05'];
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + shape + '</svg>';
};