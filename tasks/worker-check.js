#!/usr/bin/env node
/**
 * tasks/worker-check.js
 *
 * Checks web/worker.js (the Cloudflare Worker) against a built web/dist with a
 * fake ASSETS binding that behaves like Workers static assets: exact file
 * match, `/x/` serves x/index.html, `/x/index.html` redirects to `/x/`.
 * Covers SSG-first routing, 301s for /x/ and /index, real 404s and cache rules.
 *
 * Usage (after building web/): node tasks/worker-check.js   (npm run worker:check)
 */
import { readFileSync, existsSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert/strict';
const root = process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'web/dist');
const worker = (await import(join(root, 'web/worker.js'))).default;
const type = (p) => p.endsWith('.html') ? 'text/html' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream';
const env = {
  ASSETS: {
    async fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      if (path.endsWith('/index.html') && path !== '/index.html') return new Response(null, { status: 307, headers: { location: path.slice(0, -10) } });
      let file = join(dist, path);
      if (path.endsWith('/')) file = join(file, 'index.html');
      if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) return new Response('nope', { status: 404 });
      return new Response(readFileSync(file), { headers: { 'content-type': type(file) } });
    }
  }
};
const get = (p) => worker.fetch(new Request('https://anza.test' + p), env);
const cases = [
  ['/', 200, 'spa-shell'],
  ['/docs', 200, 'ssg-page'],
  ['/docs/router', 200, 'ssg-page'],
  ['/docs/router/api', 200, 'ssg-page'],
  ['/docs/router/', 301, null, '/docs/router'],
  ['/docs/router/index', 301, null, '/docs/router'],
  ['/docs/index', 301, null, '/docs'],
  ['/docs/index?x=1', 301, null, '/docs?x=1'],
  ['/docs/nope', 404, 'not-found'],
  ['/totally/unknown', 404, 'not-found'],
  ['/nope.js', 404, 'not-found'],
  ['/docs/api/errors/template.html', 200, 'static-file'],
  ['/sitemap.xml', 200, 'static-file'],
];
for (const [path, status, kind, location] of cases) {
  const res = await get(path);
  assert.equal(res.status, status, path);
  if (kind) assert.equal(res.headers.get('x-anza'), kind, path);
  if (location) assert.equal(res.headers.get('location'), location, path);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff', path);
  assert.equal(res.headers.get('content-security-policy'), "frame-ancestors 'self'", path);
  const noindex = res.headers.get('x-robots-tag') === 'noindex';
  assert.equal(noindex, status === 404 || path.endsWith('.html'), `${path} noindex`);
  if (status === 404 && kind) assert.match(await res.text(), /Page not found/);
}
console.log(`worker: ${cases.length} cases ok`);
