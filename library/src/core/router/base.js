/**
 * src/core/router/base.js
 *
 * Deploy base path for subpath static hosting (GitHub Pages, nested CDN roots).
 * Set at build time via `globalThis.__ANZA_BASE__` (see web/ssg.json `base`).
 */

/** @returns {string} Normalized base (`''` or `/anza`). */
export function getBase() {
  const raw = globalThis.__ANZA_BASE__;
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '/') return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, '') || '';
}

/**
 * Strip deploy base from a pathname before route matching.
 * @param {string} pathname
 */
export function stripBase(pathname) {
  const base = getBase();
  if (!base) return pathname || '/';
  const path = pathname || '/';
  if (path === base || path === `${base}/`) return '/';
  const prefix = `${base}/`;
  if (path.startsWith(prefix)) {
    const rest = path.slice(base.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return path;
}

/**
 * Prefix a site-root path for navigation and asset URLs.
 * @param {string} path
 */
export function withBase(path) {
  const base = getBase();
  if (!base) return path;
  if (!path || path === '/') return `${base}/`;
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//') ||
    path.startsWith('#') ||
    path.startsWith('?')
  ) {
    return path;
  }
  if (path === base || path.startsWith(`${base}/`)) return path;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * Resolve a same-origin URL string against the deploy base.
 * Root-absolute paths must go through `withBase` — `new URL('/x', origin + base)`
 * drops the deploy-base pathname (URL standard).
 * @param {string} url
 */
export function resolveAppUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
    return url;
  }
  if (url.startsWith('#') || url.startsWith('?')) {
    return url;
  }
  try {
    const base = getBase();
    const origin = globalThis.location?.origin || 'http://localhost';
    if (!base) {
      return url.startsWith('/') ? new URL(url, origin).href : url;
    }
    // Root-absolute: prefix deploy base, then absolutize against origin only.
    if (url.startsWith('/')) {
      return new URL(withBase(url), origin).href;
    }
    // Relative: resolve against the deploy base as a directory.
    return new URL(url, `${origin}${base}/`).href;
  } catch {
    return withBase(url);
  }
}

/**
 * Resolve a module asset URL (style/template) under an optional deploy base.
 * @param {string} url
 * @param {string} [moduleBase] import.meta.url of the defining module
 */
export function resolveAssetUrl(url, moduleBase) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
    return url;
  }
  if (url.startsWith('/')) {
    return resolveAppUrl(url);
  }
  if (moduleBase) {
    try {
      return new URL(url, moduleBase).href;
    } catch {
      return url;
    }
  }
  return url;
}
