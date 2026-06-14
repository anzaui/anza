/**
 * src/core/ui/defs/page.js
 *
 * `page(route, config, base)` — a route-bound navigable unit. Maps one or more
 * URL patterns to a custom element, declares the ordered container chain (`via`)
 * the router traverses to reach the render target, and gates the boot sequence
 * on the element's definition so a hard refresh waits for it.
 *
 * Route may now be a single string or an array of strings:
 *   page('/blog', config)
 *   page(['/blog', '/blog/:slug'], config)
 *
 * Source: definations.md §3, tasks.md Phase 6
 */

import { router } from '../../router/index.js';
import { gate } from '../../router/boot.js';
import { element } from '../define/element.js';
import { translate } from './spec.js';

/**
 * @param {string | string[]} route - URL pattern(s), e.g. '/blog' or ['/blog', '/blog/:slug'].
 * @param {object} config - page definition.
 * @param {string} config.tag - custom element tag (must contain a hyphen).
 * @param {string[]} [config.via] - ordered container chain, root-to-leaf.
 * @param {string} [config.container] - single container (back-compat for via).
 * @param {object} [config.props] - generic reactive props.
 * @param {Array<{name:string, type:Function}>} [config.params] - path param contract.
 * @param {Array<{name:string, type:Function}>} [config.query] - query param contract.
 * @param {Function} [config.guard] - route-scoped navigation guard.
 * @param {object} [config.on] - lifecycle hooks (load, connect, disconnect, change).
 * @param {string} [base] - import.meta.url of the caller (file templates).
 */
export function page(route, config, base) {
  const tag = config.tag;
  if (!tag) {
    const routeStr = Array.isArray(route) ? route.join(', ') : route;
    console.error(`[Native UI] page('${routeStr}') is missing a 'tag'.`);
    return;
  }

  // Normalise the route into an array of patterns.
  const routes = Array.isArray(route) ? route : [route];

  // Normalise the container chain. The render target is the last container.
  const via = Array.isArray(config.via) && config.via.length
    ? config.via
    : (config.container ? [config.container] : []);
  const target = via.at(-1) ?? null;

  const spec = translate(config, { visual: true });
  // Carry routing metadata on the spec so the orchestrator can resolve the
  // render target and cast params/query (specRegistry is populated by element()).
  spec.via = via;
  spec.container = target;
  spec.lazy = true;

  // Store the typed params/query contract on the spec for use by intercept.js.
  // Each entry: { name: string, cast: 'string' | 'number' }
  if (Array.isArray(config.params)) {
    spec.params = config.params.map(p => ({
      name: p.name,
      cast: p.type === Number ? 'number' : 'string',
    }));
  }
  if (Array.isArray(config.query)) {
    spec.query = config.query.map(q => ({
      name: q.name,
      cast: q.type === Number ? 'number' : 'string',
    }));
  }

  element(tag, spec, base);

  // Register all route patterns under the same tag.
  // Keep both `via` (full chain) and `container` (target) in meta so the
  // interceptor cascade and orchestrator both work.
  for (const pattern of routes) {
    router.register(pattern, tag, {
      ...config.meta,
      via,
      container: target,
    });
  }

  // Hold the initial match until this element is defined (hard-refresh safety).
  if (typeof customElements !== 'undefined') {
    gate(customElements.whenDefined(tag));
  }

  // Route-scoped guard: registers once and matches any of the declared patterns.
  if (typeof config.guard === 'function') {
    registerGuard(routes, config.guard);
  }
}

/** Adds a global guard that delegates to `fn` only for matching destinations. */
function registerGuard(patterns, fn) {
  const Pattern = typeof URLPattern !== 'undefined' ? URLPattern : null;
  const compiled = Pattern
    ? patterns.map(p => {
        try {
          return p.startsWith('http') ? new Pattern(p) : new Pattern({ pathname: p });
        } catch (_) { return null; }
      }).filter(Boolean)
    : [];

  router.guard(async (destination, controller) => {
    if (compiled.length > 0) {
      let url = destination?.url;
      try { url = new URL(url, globalThis.location?.href).href; } catch (_) {}
      const matches = compiled.some(pat => pat.test(url));
      if (!matches) return null; // not this route — allow
    }
    return fn(destination, controller);
  });
}

