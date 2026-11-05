'use strict';
(function(root) {
  function normalizeKey(key) {
    if (typeof key !== 'string') return '';
    if (key.startsWith('mart:mart:')) return key.slice(5);
    return key.includes(':') ? key : 'mma:'+key;
  }
  function facilityKey(row) { return normalizeKey(`${row.sourceKind || 'mma'}:${row.id}`); }
  function readSaved(value) {
    try { const entries = JSON.parse(value || '[]'); return new Set(Array.isArray(entries) ? entries.filter(id => typeof id === 'string' && id).map(normalizeKey) : []); }
    catch { return new Set(); }
  }
  function websiteUrl(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    try {
      const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : 'https://'+text);
      return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  const api = {facilityKey,normalizeKey,readSaved,websiteUrl};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BENEFIT_FACILITY_UTILS = api;
})(typeof window === 'undefined' ? globalThis : window);
