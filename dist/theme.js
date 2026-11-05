(function () {
  'use strict';
  const key = 'yeumap-theme-v1';
  const preference = value => ['light', 'dark'].includes(value) ? value : 'system';
  const resolve = (value, dark) => preference(value) === 'system' ? (dark ? 'dark' : 'light') : value;
  if (typeof module === 'object' && module.exports) module.exports = {preference, resolve};
  if (typeof window === 'undefined') return;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let selected = 'system';
  try { selected = preference(window.localStorage.getItem(key)); } catch (_) { /* Storage can be disabled. */ }
  function apply() {
    const mode = resolve(selected, media.matches);
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode === 'light' ? 'only light' : 'dark';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = mode === 'dark' ? '#14231c' : '#fcfdf9';
    document.querySelectorAll('[data-theme-select]').forEach(control => { control.value = selected; });
  }
  apply();
  media.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { selected = preference(event.newValue); apply(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('[data-theme-select]').forEach(control => {
      control.addEventListener('change', () => {
        selected = preference(control.value);
        try { window.localStorage.setItem(key, selected); } catch (_) { /* Keep the choice for this visit. */ }
        apply();
      });
    });
  });
})();
