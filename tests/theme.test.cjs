const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const {resolve, preference} = require('../dist/theme.js');

test('manual theme overrides the device preference', () => {
  assert.equal(resolve('light', true), 'light');
  assert.equal(resolve('dark', false), 'dark');
  assert.equal(resolve('system', true), 'dark');
  assert.equal(resolve('system', false), 'light');
  assert.equal(preference('unexpected'), 'system');
});

test('theme restores, persists, follows system changes and syncs tabs', () => {
  const events = {}, mediaEvents = {}, documentEvents = {}, controlEvents = {};
  const root = {dataset: {}, style: {}}, meta = {}, control = {addEventListener: (name, fn) => controlEvents[name] = fn};
  const stored = new Map([['yeumap-theme-v1', 'light']]);
  const media = {matches: true, addEventListener: (name, fn) => mediaEvents[name] = fn};
  const window = {matchMedia: () => media, localStorage: {getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value)}, addEventListener: (name, fn) => events[name] = fn};
  const document = {documentElement: root, querySelector: () => meta, querySelectorAll: () => [control], addEventListener: (name, fn) => documentEvents[name] = fn};
  vm.runInNewContext(fs.readFileSync(require.resolve('../dist/theme.js'), 'utf8'), {window, document});
  assert.equal(root.dataset.theme, 'light');
  assert.equal(root.style.colorScheme, 'only light');
  documentEvents.DOMContentLoaded();
  control.value = 'dark'; controlEvents.change();
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(stored.get('yeumap-theme-v1'), 'dark');
  media.matches = false; mediaEvents.change();
  assert.equal(root.dataset.theme, 'dark');
  events.storage({key: 'yeumap-theme-v1', newValue: 'system'});
  assert.equal(root.dataset.theme, 'light');
  media.matches = true; mediaEvents.change();
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(meta.content, '#14231c');
  events.storage({key: 'yeumap-theme-v1', newValue: null});
  assert.equal(control.value, 'system');
});
