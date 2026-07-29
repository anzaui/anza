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
 * @param {string} url
 */
export function resolveAppUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
    return url;
  }
  try {
    const base = getBase();
    if (!base) return url;
    const origin = globalThis.location?.origin || 'http://localhost';
    const resolved = new URL(url, `${origin}${base}/`);
    return resolved.href;
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
    const base = getBase();
    if (base) {
      return resolveAppUrl(url);
    }
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
