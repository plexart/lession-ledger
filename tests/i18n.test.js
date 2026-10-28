import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { interpolate, setMessages, t } from '../js/i18n.js';

test('interpolate replaces known placeholders only', () => {
  assert.equal(interpolate('{a} / {b} / {c}', { a: 1, b: 'x' }), '1 / x / {c}');
});

test('t falls back to the key for missing messages', () => {
  setMessages({ hello: '你好 {name}' }, 'zh-CN');
  assert.equal(t('hello', { name: '甲' }), '你好 甲');
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(t('nope'), 'nope');
  } finally {
    console.warn = warn;
  }
});

test('every literal i18n key used in the source exists in zh-CN', () => {
  const root = new URL('../', import.meta.url);
  const locale = JSON.parse(readFileSync(new URL('locales/zh-CN.json', root), 'utf8'));
  const files = ['index.html', ...readdirSync(new URL('js/', root), { recursive: true })
    .filter((f) => f.endsWith('.js')).map((f) => `js/${f}`)];
  const pattern = /\b(?:t|raw)\('([\w.]+)'|data-i18n(?:-[\w-]+)?="([\w.]+)"/g;
  const missing = [];
  for (const file of files) {
    const text = readFileSync(new URL(file, root), 'utf8');
    for (const m of text.matchAll(pattern)) {
      const key = m[1] ?? m[2];
      if (!Object.hasOwn(locale, key)) missing.push(`${file}: ${key}`);
    }
  }
  assert.deepEqual(missing, []);
});
