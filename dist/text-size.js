(function () {
  'use strict';
  const key = 'yeumap-text-size-v1';
  const normalize = value => ['normal', 'large', 'extra'].includes(value) ? value : 'large';
  if (typeof module === 'object' && module.exports) module.exports = {normalize};
  if (typeof window === 'undefined') return;
  let size = 'large';
  try { size = normalize(window.localStorage.getItem(key)); } catch (_) { /* Storage is optional. */ }
  function apply() {
    document.documentElement.dataset.textSize = size;
    document.querySelectorAll('[data-text-size]').forEach(control => { control.value = size; });
  }
  apply();
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { size = normalize(event.newValue); apply(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    const menu = document.querySelector('.menu-toggle');
    if (menu) menu.addEventListener('click', () => {
      const expanded = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(expanded));
      document.querySelector('#header-menu').classList.toggle('is-open', expanded);
    });
    const mapInfo = document.querySelector('.map-info');
    if (mapInfo) mapInfo.open = !window.matchMedia('(max-width:760px)').matches;
    document.querySelectorAll('[data-text-size]').forEach(control => {
      control.addEventListener('change', () => {
        size = normalize(control.value);
        try { window.localStorage.setItem(key, size); } catch (_) { /* Keep the current visit usable. */ }
        apply();
      });
    });
    const header = document.querySelector('header');
    if (header && window.ResizeObserver) {
      new window.ResizeObserver(() => {
        document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
      }).observe(header);
    }
  });
})();
