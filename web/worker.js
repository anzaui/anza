/**
 * Cloudflare Worker in front of the static `dist/` assets.
 *
 * Caching: only content-hashed file names (`app.3f9a1c2e.js`) are immutable.
 * Every other file (unhashed JS/CSS, importmap.json, routes.json, sw.js) and
 * every HTML document is `no-cache`, so a deploy is picked up on the next
 * normal reload (the browser revalidates instead of trusting a year-long cache).
 */

const HASHED = /[.-][0-9a-f]{8,}\.[a-z0-9]+$/i;
const IMMUTABLE = 'public, max-age=31536000, immutable';
const REVALIDATE = 'no-cache';

function withHeaders(res, kind, cacheControl) {
  const headers = new Headers(res.headers);
  headers.set('X-Anza', kind);
  headers.set('Cache-Control', cacheControl);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** Fetches a site asset by pathname, following one asset-level redirect (e.g. `/x/index.html` → `/x/`). */
async function asset(env, request, pathname) {
  const url = new URL(pathname, request.url);
  let res = await env.ASSETS.fetch(new Request(url, { method: request.method, headers: request.headers, redirect: 'manual' }));
  const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
  if (location) {
    res = await env.ASSETS.fetch(new Request(new URL(location, url), { method: request.method, headers: request.headers, redirect: 'manual' }));
  }
  return res;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Any path with a file extension is a real static file (site-root assets)
    if (path.includes('.')) {
      const res = await env.ASSETS.fetch(request);
      const isHtml = path.endsWith('.html');
      const cacheControl = !isHtml && HASHED.test(path) ? IMMUTABLE : REVALIDATE;
      return withHeaders(res, 'static-file', cacheControl);
    }

    // Extensionless path: prefer the pre-rendered (SSG) page, if one exists.
    if (path !== '/') {
      const page = await asset(env, request, `${path.replace(/\/+$/, '')}/index.html`);
      if (page.ok && (page.headers.get('content-type') ?? 'text/html').includes('text/html')) {
        return withHeaders(page, 'ssg-page', REVALIDATE);
      }
    }

    // Otherwise it is an SPA route: serve the shell.
    const res = await env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
    return withHeaders(res, 'spa-shell', REVALIDATE);
  }
};
