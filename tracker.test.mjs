import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

const source = readFileSync(new URL('./tracker.js', import.meta.url), 'utf8');
const website = 'a'.repeat(48);
function run({ src = 'https://api.hexvork.com/api/services/tracker.js', collector, dnt } = {}) {
  const sent = [];
  const listeners = {};
  const storage = new Map();
  const context = {
    URL, Set, Uint8Array, crypto: webcrypto, Date, JSON, queueMicrotask,
    navigator: { language: 'zh-CN', doNotTrack: dnt },
    location: { origin: 'https://customer.example', protocol: 'https:', pathname: '/hello' },
    document: {
      currentScript: { src, getAttribute: key => ({ 'data-website-id': website, 'data-collect-url': collector })[key] },
      readyState: 'complete', visibilityState: 'visible', referrer: 'https://referrer.example/path?secret=value',
      title: 'Customer page', querySelector: () => null, querySelectorAll: () => [],
    },
    screen: { width: 1280, height: 720 },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    history: { pushState() {}, replaceState() {} },
    addEventListener: (name, fn) => { listeners[name] = fn; },
    fetch: async (url, options) => { sent.push({ url: String(url), options, body: JSON.parse(options.body) }); return { ok: true }; },
  };
  context.window = context;
  runInNewContext(source, context);
  return { sent, context, listeners, rerun: () => runInNewContext(source, context) };
}

test('backend script keeps existing collection URL and omits credentials', () => {
  const { sent } = run();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, `https://api.hexvork.com/api/services/analytics/collect?website_id=${website}`);
  assert.equal(sent[0].options.credentials, 'omit');
  assert.equal(sent[0].body.url, 'https://customer.example/hello');
  assert.equal(sent[0].body.referrer, 'https://referrer.example');
});

test('CDN script posts only to the configured backend', async () => {
  const { sent, context, rerun } = run({ src: 'https://cdn.jsdmirror.com/gh/Hexvork/HexID@abc123/tracker.js', collector: 'https://api.hexvork.com/api/services/analytics/collect' });
  assert.equal(new URL(sent[0].url).host, 'api.hexvork.com');
  rerun();
  assert.equal(sent.length, 1, 'installing the script twice must not duplicate listeners or views');
  context.location.pathname = '/next';
  context.history.pushState({}, '', '/next?private=value');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent.length, 2);
  assert.equal(sent[1].body.url, 'https://customer.example/next');
});

test('invalid, credential-bearing, or mixed-content collector is ignored', () => {
  for (const collector of ['http://[', 'javascript:alert(1)', 'https://secret@example.com/collect', 'http://api.hexvork.com/collect']) {
    assert.equal(run({ collector }).sent.length, 0, collector);
  }
});

test('Do Not Track prevents collection', () => {
  assert.equal(run({ dnt: '1' }).sent.length, 0);
});
