/* HexID Analytics: deferred, no cookies, no query strings or raw IP storage. */
(() => {
  'use strict';
  const script = document.currentScript;
  const website = script?.getAttribute('data-website-id');
  if (!script?.src || !/^[a-f0-9]{48}$/.test(website || '')) return;
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  let endpoint;
  try {
    // CDN hosts serve only this file; collection stays on the HexID backend.
    endpoint = new URL(script.getAttribute('data-collect-url') || './analytics/collect', script.src);
    if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) return;
    if (location.protocol === 'https:' && endpoint.protocol !== 'https:') return;
    endpoint.searchParams.set('website_id', website);
  } catch { return; }
  const installed = window.__hexAnalyticsSites ||= new Set();
  if (installed.has(website)) return;
  installed.add(website);
  const random = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
  let memorySession = { id: random(), at: Date.now() };
  let lastPath = '';
  function session() {
    let saved = memorySession;
    try { saved = JSON.parse(sessionStorage.getItem('hex-analytics-' + website) || 'null') || saved; } catch {}
    if (!/^[a-f0-9]{32}$/.test(saved.id) || Date.now() - saved.at > 1800000) saved = { id: random(), at: 0 };
    saved.at = Date.now(); memorySession = saved;
    try { sessionStorage.setItem('hex-analytics-' + website, JSON.stringify(saved)); } catch {}
    return saved.id;
  }
  const counterTargets = {
    pv: '[data-hex-site-pv], #busuanzi_value_site_pv',
    uv: '[data-hex-site-uv], #busuanzi_value_site_uv',
    page_pv: '[data-hex-page-pv], #busuanzi_value_page_pv',
  };
  function counters(data) {
    for (const [name, selector] of Object.entries(counterTargets)) {
      if (typeof data?.[name] !== 'number') continue;
      document.querySelectorAll(selector).forEach(node => { node.textContent = String(data[name]); });
    }
    document.querySelectorAll('#busuanzi_container_site_pv, #busuanzi_container_site_uv, #busuanzi_container_page_pv').forEach(node => { node.style.removeProperty('display'); node.hidden = false; });
  }
  async function send(payload, retry = true) {
    try {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'omit', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(payload) });
      if (response.ok && payload.counters) counters((await response.json()).counters);
      else if (response.status >= 500 && retry) setTimeout(() => void send(payload, false), 3000);
    } catch { if (retry) setTimeout(() => void send(payload, false), 3000); }
  }
  function track() {
    if (document.visibilityState === 'prerender' || lastPath === location.pathname) return;
    lastPath = location.pathname;
    let referrer = ''; try { referrer = new URL(document.referrer).origin; } catch {}
    void send({ website_id: website, event_id: random(), session: session(), url: location.origin + location.pathname, title: document.title.slice(0, 200), referrer, language: navigator.language, screen: screen.width + 'x' + screen.height, counters: Object.values(counterTargets).some(selector => document.querySelector(selector)) });
  }
  for (const key of ['pushState', 'replaceState']) {
    const original = history[key];
    history[key] = function(...args) { const result = original.apply(this, args); queueMicrotask(track); return result; };
  }
  addEventListener('popstate', track);
  addEventListener('pageshow', track);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', track, { once: true });
  else track();
})();
