/**
 * src/core/router/match.js
 *
 * Route table registration and URLPattern matcher.
 * Compiles patterns lazily and extracts named capture group parameters on success.
 *
 * Source: doc 09 — Routing §3, §4
 */

import { guard } from '../platform/index.js';
import { resolveTag } from './handler.js';
import { stripBase } from './base.js';
import { insert as trieInsert, find as trieFind, clear as trieClear } from './trie.js';

const routes = [];
// Resolve Pattern class at module load if available natively (RT-03)
let Pattern = typeof URLPattern !== 'undefined' ? URLPattern : null;

// Pre-resolve polyfill in background if not native
if (!Pattern) {
  guard.urlPattern().then(cls => {
    Pattern = cls;
  }).catch(() => {});
}

async function getURLPattern() {
  if (!Pattern) {
    Pattern = await guard.urlPattern();
  }
  return Pattern;
}

function getSpecificity(patternStr) {
  if (patternStr === '*') return 0;
  const hasWildcard = patternStr.includes('*');
  const hasParam = patternStr.includes(':');
  
  if (!hasWildcard && !hasParam) return 3; // Static: highest
  if (!hasWildcard && hasParam) return 2;  // Params: medium
  return 1;                                // Wildcard: low
}

function conflict(pathA, pathB) {
  if (pathA === pathB) return false;
  const segsA = pathA.split('/').filter(s => s.length > 0);
  const segsB = pathB.split('/').filter(s => s.length > 0);

  if (segsA.length !== segsB.length) return false;

  for (let i = 0; i < segsA.length; i++) {
    const sa = segsA[i];
    const sb = segsB[i];
    const isDynA = sa.startsWith(':') || sa === '*' || sa.includes('*');
    const isDynB = sb.startsWith(':') || sb === '*' || sb.includes('*');

    if (!isDynA && !isDynB && sa !== sb) {
      return false; // static mismatch
    }
  }

  return true;
}

/**
 * Registers a route mapping.
 */
export function register(patternStr, handler, meta = {}) {
  // Check conflicts with existing routes before registering
  for (const r of routes) {
    if (conflict(patternStr, r.patternStr)) {
      console.warn(
        `[anza] WARNING: Route pattern conflict: "${patternStr}" overlaps with "${r.patternStr}"`
      );
    }
  }

  const route = {
    patternStr,
    handler,
    meta,
    pattern: null
  };
  routes.push(route);

  // Index in the radix trie for O(k) matching. Patterns the trie cannot
  // express (regex groups, modifiers, absolute URLs) stay on the URLPattern
  // scan below — trieInsert returns false for those.
  trieInsert(patternStr, route);

  // Sort routes by specificity (descending) and length (longer first) at registration time (RT-04)
  routes.sort((a, b) => {
    const specA = getSpecificity(a.patternStr);
    const specB = getSpecificity(b.patternStr);
    if (specA !== specB) return specB - specA;
    return b.patternStr.length - a.patternStr.length;
  });
}

/**
 * Matches a URL against the registered routes.
 */
export async function match(url) {
  // Use pre-resolved Pattern class synchronously on hot path (RT-03)
  const P = Pattern || (await getURLPattern());
  const targetUrl = new URL(url, globalThis.location?.href || 'http://localhost');
  const routePath = stripBase(targetUrl.pathname);

  // Fast path: O(k) radix-trie lookup on the pathname. Covers the common case
  // of plain/:param/* patterns without compiling or executing a URLPattern.
  const trieHit = trieFind(routePath);
  if (trieHit) {
    return finalize(trieHit.route, trieHit.params, targetUrl, null);
  }

  // Fallback: URLPattern scan for patterns the trie cannot express
  // (regex groups, modifiers, absolute-URL patterns).
  for (const route of routes) {
    if (!route.pattern) {
      if (route.patternStr.startsWith('http://') || route.patternStr.startsWith('https://')) {
        route.pattern = new P(route.patternStr);
      } else {
        route.pattern = new P({ pathname: route.patternStr });
      }
    }

    const execUrl = new URL(targetUrl.href);
    execUrl.pathname = routePath;
    const result = route.pattern.exec(execUrl.href);
    if (result) {
      return finalize(route, result.pathname.groups || {}, targetUrl, result);
    }
  }

  return null;
}

/**
 * Builds the full match result (tag, query, hash, parent chain) for a matched
 * route. The parent chain walk is cycle-guarded so a misconfigured
 * A→B→A parent loop breaks instead of hanging (RT bug 8.3).
 */
async function finalize(route, params, targetUrl, result) {
  const tag = await resolveTag(route.handler);
  const query = Object.fromEntries(targetUrl.searchParams.entries());
  const hash = targetUrl.hash;

  const chain = [];
  const visited = new Set();
  let currentRoute = route;
  while (currentRoute) {
    if (visited.has(currentRoute.patternStr)) break; // cycle detected
    visited.add(currentRoute.patternStr);

    const currentTag = await resolveTag(currentRoute.handler);
    chain.unshift({ route: currentRoute, tag: currentTag, params });

    const parentPattern = currentRoute.meta?.parent;
    currentRoute = parentPattern
      ? routes.find(r => r.patternStr === parentPattern)
      : null;
  }

  return { route, tag, params, query, hash, chain, result };
}

/**
 * Clears the route registry.
 */
export function clear() {
  routes.length = 0;
  trieClear();
}

/**
 * Returns all currently registered routes.
 */
export function getRoutes() {
  return routes;
}

/**
 * Bulk registers routes from a JSON array or object.
 * Accepts an array of { pattern, handler, meta } objects.
 */
export function load(routesData) {
  const routesArray = Array.isArray(routesData) ? routesData : [routesData];
  for (const { pattern, handler, meta } of routesArray) {
    if (pattern && handler) {
      register(pattern, handler, meta || {});
    }
  }
}
