#!/usr/bin/env node
/**
 * tasks/bench-load.js
 *
 * Cold page-load benchmark for a built site (default: web/dist). Serves dist
 * over HTTP/2 + TLS (like production; HTTP/1.1 would cap at 6 connections)
 * with production-like routing and headers, then loads a few pages in a fresh
 * browser context with "Fast 4G" network throttling and records:
 *
 *   - requests until `load` and until ready (last `anza:ready` event)
 *   - encoded (on-the-wire) HTML / JS / CSS bytes
 *   - critical path depth (longest initiator chain after the HTML)
 *   - LCP, TBT approximation (long tasks over 50 ms), time to ready
 *
 * Routing mirrors web/worker.js: paths with a dot are files, other paths
 * serve <path>/index.html when it exists, else the /index.html shell. When
 * dist/_headers exists, its rules (Cache-Control, Link) are applied. Text
 * responses are brotli-compressed: a precompressed `.br` sibling is used when
 * present, otherwise quality 5 on the fly (roughly what a CDN does).
 *
 * Usage (repo root):
 *   npm run bench:load
 *   npm run bench:load -- --runs 5 --json --out /tmp/bench.json
 *   npm run bench:load -- --budget          # exit 1 when a DIST §4 budget fails
 *   npm run bench:load -- --dist web/dist --page /docs/intro/start
 *
 * BENCH_DUMP=<file> writes the raw request list of the last run (debugging).
 *
 * Needs a local Chrome/Chromium (CHROME_PATH, or found the same way
 * @web/test-runner-chrome finds it) and puppeteer-core from library/node_modules.
 */

import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createSecureServer } from 'node:http2';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants as zlib } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(ROOT, 'library', 'package.json'));

// DIST.md §4 budgets (per SSG route, cold, no cache).
const BUDGETS = {
  requestsReady: 12,
  depth: 2,
  jsKB: 75, // 60 KB shared + 15 KB per route (brotli)
  htmlKB: 15, // brotli
  repeatedInlineCssKB: 0,
  lcpMs: 1800,
  tbtMs: 150,
};

// Inline <style> blocks at or below this size are not "repeated CSS" (bytes).
const INLINE_CSS_MIN = 200;

const DEFAULT_PAGES = ['/', '/docs/intro/start', '/docs/elements/button'];

function parseArgs(argv) {
  const opts = { dist: join(ROOT, 'web', 'dist'), runs: 3, pages: [], json: false, out: null, budget: false, cpu: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--dist') opts.dist = resolve(next());
    else if (a === '--runs') opts.runs = Math.max(1, Number(next()) || 1);
    else if (a === '--page') opts.pages.push(next());
    else if (a === '--json') opts.json = true;
    else if (a === '--out') opts.out = resolve(next());
    else if (a === '--budget') opts.budget = true;
    else if (a === '--cpu') opts.cpu = Math.max(1, Number(next()) || 1);
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
      process.exit(0);
    } else {
      console.error(`unknown argument: ${a}`);
      process.exit(2);
    }
  }
  if (!opts.pages.length) opts.pages = DEFAULT_PAGES;
  return opts;
}

// Static server

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};
const TEXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.xml', '.txt']);

/** Parse a Cloudflare-style `_headers` file into [{ pattern, headers }]. */
function loadHeaders(dist) {
  const file = join(dist, '_headers');
  if (!existsSync(file)) return [];
  const rules = [];
  let current = null;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      current = { pattern: raw.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      const line = raw.trim();
      const idx = line.indexOf(':');
      if (idx > 0) current.headers.push([line.slice(0, idx).trim().toLowerCase(), line.slice(idx + 1).trim()]);
    }
  }
  return rules;
}

function matches(pattern, path) {
  const re = new RegExp(
    '^' + pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'
  );
  return re.test(path);
}

function resolveFile(dist, path) {
  const clean = decodeURIComponent(path.split('?')[0]);
  if (clean.includes('..')) return null;
  if (clean.includes('.')) {
    const f = join(dist, clean);
    return existsSync(f) && statSync(f).isFile() ? f : null;
  }
  if (clean !== '/') {
    const page = join(dist, clean.replace(/\/+$/, ''), 'index.html');
    if (existsSync(page)) return page;
  }
  return join(dist, 'index.html');
}

function selfSignedCert() {
  const dir = mkdtempSync(join(tmpdir(), 'anza-bench-'));
  try {
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '1',
      '-subj', '/CN=localhost', '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem'),
    ], { stdio: 'ignore' });
    return { key: readFileSync(join(dir, 'key.pem')), cert: readFileSync(join(dir, 'cert.pem')) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function startServer(dist) {
  const rules = loadHeaders(dist);
  const compressed = new Map();
  const server = createSecureServer({ ...selfSignedCert(), allowHTTP1: true }, (req, res) => {
    const url = new URL(req.url, 'https://localhost');
    const file = resolveFile(dist, url.pathname);
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    const ext = extname(file);
    const headers = { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-cache' };
    for (const rule of rules) {
      if (!matches(rule.pattern, url.pathname)) continue;
      for (const [k, v] of rule.headers) {
        if (k === 'link' && headers.link) headers.link += `, ${v}`;
        else headers[k] = v;
      }
    }
    let body = readFileSync(file);
    const accepts = String(req.headers['accept-encoding'] || '');
    if (TEXT.has(ext) && accepts.includes('br')) {
      if (existsSync(file + '.br')) {
        body = readFileSync(file + '.br');
      } else {
        let cached = compressed.get(file);
        if (!cached) {
          cached = brotliCompressSync(body, { params: { [zlib.BROTLI_PARAM_QUALITY]: 5 } });
          compressed.set(file, cached);
        }
        body = cached;
      }
      headers['content-encoding'] = 'br';
      headers.vary = 'Accept-Encoding';
    }
    headers['content-length'] = body.length;
    res.writeHead(200, headers);
    res.end(body);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

// Browser

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  try {
    const { Launcher } = require('chrome-launcher');
    const found = Launcher.getInstallations();
    if (found.length) return found[0];
  } catch {}
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      return execFileSync('which', [name], { encoding: 'utf8' }).trim();
    } catch {}
  }
  throw new Error('no Chrome found: set CHROME_PATH');
}

/** Injected before any page script: records LCP, long tasks and anza:ready. */
const PROBE = `(() => {
  const m = (window.__bench = { lcp: 0, longTasks: [], ready: [], fcp: 0 });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) m.lcp = e.startTime; })
    .observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) m.longTasks.push([e.startTime, e.duration]); })
    .observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') m.fcp = e.startTime; })
    .observe({ type: 'paint', buffered: true });
  const dispatch = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (ev) {
    if (ev && ev.type === 'anza:ready') m.ready.push(performance.now());
    return dispatch.call(this, ev);
  };
})();`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function measure(browser, origin, path, cpu) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    // Puppeteer's PredefinedNetworkConditions['Fast 4G'].
    latency: 60 * 2.75,
    downloadThroughput: ((9 * 1000 * 1000) / 8) * 0.9,
    uploadThroughput: ((1.5 * 1000 * 1000) / 8) * 0.9,
  });
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.evaluateOnNewDocument(PROBE);

  const reqs = new Map();
  let t0 = 0;
  let lastActivity = 0;
  cdp.on('Network.requestWillBeSent', (e) => {
    if (e.redirectResponse) return;
    if (!t0) t0 = e.timestamp;
    lastActivity = Date.now();
    const init = e.initiator || {};
    let parent = init.url || null;
    if (!parent && init.stack) {
      for (let s = init.stack; s && !parent; s = s.parent) parent = s.callFrames?.find((f) => f.url)?.url || null;
    }
    reqs.set(e.requestId, { url: e.request.url, type: e.type, start: (e.timestamp - t0) * 1000, parent, bytes: 0 });
  });
  cdp.on('Network.loadingFinished', (e) => {
    lastActivity = Date.now();
    const r = reqs.get(e.requestId);
    if (r) r.bytes = e.encodedDataLength;
  });

  const url = origin + path;
  const navStart = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  const loadMs = Date.now() - navStart;
  // Settle: no network activity and no anza:ready for 1.5 s.
  let lastReadyCount = -1;
  for (let i = 0; i < 120; i++) {
    await sleep(250);
    const count = await page.evaluate(() => window.__bench.ready.length);
    if (count !== lastReadyCount) {
      lastReadyCount = count;
      lastActivity = Math.max(lastActivity, Date.now());
    }
    if (Date.now() - lastActivity > 1500) break;
  }
  const probe = await page.evaluate(() => ({
    ...window.__bench,
    loadEvent: performance.getEntriesByType('navigation')[0]?.loadEventStart || 0,
  }));
  if (process.env.BENCH_DUMP) writeFileSync(process.env.BENCH_DUMP, JSON.stringify([...reqs.values()], null, 1));
  await context.close();

  const readyMs = probe.ready.length ? Math.max(...probe.ready) : probe.loadEvent;
  const list = [...reqs.values()].filter((r) => !r.url.startsWith('data:'));
  // Depth: document = 0; every other request = 1 + depth of its initiator.
  const byUrl = new Map();
  for (const r of list) if (!byUrl.has(r.url)) byUrl.set(r.url, r);
  const depthOf = (r, seen = new Set()) => {
    if (r.type === 'Document') return 0;
    if (r.depth !== undefined) return r.depth;
    const p = r.parent && byUrl.get(r.parent);
    if (!p || seen.has(p)) return (r.depth = 1);
    seen.add(r);
    return (r.depth = 1 + depthOf(p, seen));
  };
  const bytes = { html: 0, js: 0, css: 0, font: 0, other: 0 };
  for (const r of list) {
    const kind = r.type === 'Document' ? 'html' : r.type === 'Script' ? 'js' : r.type === 'Stylesheet' ? 'css'
      : /\.m?js(\?|$)/.test(r.url) ? 'js' : /\.css(\?|$)/.test(r.url) ? 'css' : /\.html(\?|$)/.test(r.url) ? 'html' : r.type === 'Font' ? 'font' : 'other';
    bytes[kind] += r.bytes;
  }
  const docBytes = list.find((r) => r.type === 'Document')?.bytes || 0;
  const tbt = probe.longTasks
    .filter(([start]) => start >= (probe.fcp || 0) && start <= readyMs)
    .reduce((sum, [, d]) => sum + Math.max(0, d - 50), 0);
  return {
    requestsLoad: list.filter((r) => r.start <= probe.loadEvent).length,
    requestsReady: list.filter((r) => r.start <= readyMs).length,
    requestsTotal: list.length,
    depth: Math.max(0, ...list.filter((r) => r.start <= readyMs).map((r) => depthOf(r))),
    htmlKB: docBytes / 1024,
    bytesKB: { html: bytes.html / 1024, js: bytes.js / 1024, css: bytes.css / 1024, font: bytes.font / 1024, other: bytes.other / 1024 },
    lcpMs: probe.lcp,
    tbtMs: tbt,
    loadMs: probe.loadEvent || loadMs,
    readyMs,
    readyEvents: probe.ready.length,
  };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Median of each numeric field across runs (counts are normally identical). */
function combine(runs) {
  const pick = (f) => median(runs.map(f));
  return {
    requestsLoad: pick((r) => r.requestsLoad),
    requestsReady: pick((r) => r.requestsReady),
    requestsTotal: pick((r) => r.requestsTotal),
    depth: pick((r) => r.depth),
    htmlKB: pick((r) => r.htmlKB),
    bytesKB: {
      html: pick((r) => r.bytesKB.html),
      js: pick((r) => r.bytesKB.js),
      css: pick((r) => r.bytesKB.css),
      font: pick((r) => r.bytesKB.font),
      other: pick((r) => r.bytesKB.other),
    },
    lcpMs: pick((r) => r.lcpMs),
    tbtMs: pick((r) => r.tbtMs),
    loadMs: pick((r) => r.loadMs),
    readyMs: pick((r) => r.readyMs),
    readyEvents: pick((r) => r.readyEvents),
  };
}

// Static dist metrics

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Inline `<style>` bytes whose exact content appears in more than one HTML file. */
function staticMetrics(dist) {
  const files = walk(dist);
  const html = files.filter((f) => f.endsWith('.html'));
  const seen = new Map();
  let htmlBytes = 0;
  for (const f of html) {
    const text = readFileSync(f, 'utf8');
    htmlBytes += text.length;
    const unique = new Set();
    for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) unique.add(m[1]);
    for (const s of unique) seen.set(s, (seen.get(s) || 0) + 1);
  }
  // Tiny blocks (e.g. the 36-byte dock `:host` rule) cost less inline than a
  // <link> would; only blocks worth extracting into a shared file count.
  let repeated = 0;
  for (const [s, n] of seen) if (n > 1 && s.length > INLINE_CSS_MIN) repeated += s.length * (n - 1);
  return {
    files: files.length,
    htmlFiles: html.length,
    htmlTotalKB: htmlBytes / 1024,
    repeatedInlineCssKB: repeated / 1024,
    junk: files.filter((f) => f.endsWith('.d.ts')).length,
  };
}

// Main

const fmt = (n, d = 0) => (typeof n === 'number' ? n.toFixed(d) : String(n));

function table(results, stat) {
  const cols = ['page', 'req@load', 'req@ready', 'depth', 'doc KB', 'HTML KB', 'JS KB', 'CSS KB', 'LCP ms', 'TBT ms', 'ready ms'];
  const rows = results.map(({ page, metrics: m }) => [
    page, fmt(m.requestsLoad), fmt(m.requestsReady), fmt(m.depth), fmt(m.htmlKB, 1), fmt(m.bytesKB.html, 1), fmt(m.bytesKB.js, 1),
    fmt(m.bytesKB.css, 1), fmt(m.lcpMs), fmt(m.tbtMs), fmt(m.readyMs),
  ]);
  const widths = cols.map((c, i) => Math.max(c.length, ...rows.map((r) => r[i].length)));
  const line = (r) => '| ' + r.map((v, i) => v.padEnd(widths[i])).join(' | ') + ' |';
  console.log(line(cols));
  console.log('|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|');
  for (const r of rows) console.log(line(r));
  console.log(
    `\ndist: ${stat.files} files, ${stat.htmlFiles} HTML (${fmt(stat.htmlTotalKB)} KB raw), ` +
      `repeated inline CSS ${fmt(stat.repeatedInlineCssKB)} KB, .d.ts files ${stat.junk}`
  );
  console.log('(KB = encoded bytes on the wire, brotli; doc = the page document, HTML = document + fetched templates; Fast 4G; medians)');
}

function checkBudgets(results, stat) {
  const fails = [];
  for (const { page, metrics: m } of results) {
    const check = (name, value, max) => {
      if (value > max) fails.push(`${page}: ${name} ${fmt(value, 1)} > ${max}`);
    };
    check('requests before ready', m.requestsReady, BUDGETS.requestsReady);
    check('critical path depth', m.depth, BUDGETS.depth);
    check('JS KB (br)', m.bytesKB.js, BUDGETS.jsKB);
    check('HTML KB (br)', m.htmlKB, BUDGETS.htmlKB);
    check('LCP ms', m.lcpMs, BUDGETS.lcpMs);
    check('TBT ms', m.tbtMs, BUDGETS.tbtMs);
  }
  if (stat.repeatedInlineCssKB > BUDGETS.repeatedInlineCssKB) {
    fails.push(`site: repeated inline CSS ${fmt(stat.repeatedInlineCssKB, 1)} KB > ${BUDGETS.repeatedInlineCssKB}`);
  }
  return fails;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!existsSync(join(opts.dist, 'index.html'))) {
    console.error(`no build at ${opts.dist} (run anza build in web/ first)`);
    process.exit(2);
  }
  const puppeteer = require('puppeteer-core');
  const server = await startServer(opts.dist);
  const origin = `https://localhost:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    acceptInsecureCerts: true,
    args: ['--ignore-certificate-errors', '--no-first-run', '--disable-extensions'],
  });
  const results = [];
  try {
    for (const page of opts.pages) {
      const runs = [];
      for (let i = 0; i < opts.runs; i++) runs.push(await measure(browser, origin, page, opts.cpu));
      results.push({ page, metrics: combine(runs), runs });
    }
  } finally {
    await browser.close();
    server.close();
  }
  const stat = staticMetrics(opts.dist);
  const report = {
    date: new Date().toISOString(),
    dist: opts.dist,
    network: 'Fast 4G (165 ms RTT, 8.1 Mbps down)',
    cpuSlowdown: opts.cpu,
    runs: opts.runs,
    budgets: BUDGETS,
    static: stat,
    pages: results.map(({ page, metrics }) => ({ page, ...metrics })),
  };
  if (opts.out) writeFileSync(opts.out, JSON.stringify(report, null, 2) + '\n');
  if (opts.json) console.log(JSON.stringify(report, null, 2));
  else table(results, stat);

  if (opts.budget) {
    const fails = checkBudgets(results, stat);
    if (fails.length) {
      console.error(`\n${fails.length} budget(s) over (CLEAN/DIST.md §4):`);
      for (const f of fails) console.error(`  - ${f}`);
      process.exit(1);
    }
    console.log('\nAll DIST budgets pass.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
