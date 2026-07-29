/**
 * src/core/router/pages.js
 *
 * Dock/page-scoped fallback leaves (notfound, error, offline).
 *
 * Product model: nested docks each own defaults/overrides. Soft-nav miss/error
 * swaps the LEAF dock only — never a document-wide shell wipe.
 *
 * Precedence (highest → lowest):
 *   1. Route-level page({ error }) — error kind only
 *   2. Dock chain leaf→root (deepest dock that defines the kind)
 *   3. Optional app router.pages.configure({ … })
 *   4. Built-in minimal HTML
 *
 * Host = deepest live dock in via / lastVia (leaf). Template may come from
 * that dock or an ancestor; parents stay mounted.
 */

import { getContainer } from './container.js';
import { root as graphRoot } from './graph.js';
import { clearLoading } from './loading.js';

const DEFAULT_NOTFOUND_HTML = `
  <div style="
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    min-height:60vh;gap:1rem;padding:2rem;text-align:center;font-family:inherit;
  ">
    <span style="font-size:3rem;font-weight:800;opacity:.15;">404</span>
    <p style="margin:0;font-size:1rem;opacity:.5;">Page not found</p>
    <a href="/" style="font-size:.875rem;opacity:.6;text-decoration:none;">← Go home</a>
  </div>
`;

const DEFAULT_ERROR_HTML = `
  <div style="
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    min-height:60vh;gap:1rem;padding:2rem;text-align:center;font-family:inherit;
  ">
    <span style="font-size:3rem;font-weight:800;opacity:.15;">5xx</span>
    <p style="margin:0;font-size:1rem;opacity:.5;">Something went wrong</p>
    <a href="/" style="font-size:.875rem;opacity:.6;text-decoration:none;">← Go home</a>
  </div>
`;

const DEFAULT_OFFLINE_HTML = `
  <div style="
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    min-height:60vh;gap:1rem;padding:2rem;text-align:center;font-family:inherit;
  ">
    <span style="font-size:3rem;font-weight:800;opacity:.15;">Offline</span>
    <p style="margin:0;font-size:1rem;opacity:.5;">You appear to be offline</p>
    <a href="/" style="font-size:.875rem;opacity:.6;text-decoration:none;">← Try home</a>
  </div>
`;

const DEFAULTS = {
  notfound: DEFAULT_NOTFOUND_HTML,
  error: DEFAULT_ERROR_HTML,
  offline: DEFAULT_OFFLINE_HTML
};

const ARIA = {
  notfound: 'Page not found',
  error: 'Application error',
  offline: 'Offline'
};

/** @type {{ notfound: any, error: any, offline: any }} */
let appConfig = { notfound: null, error: null, offline: null };
let notFoundHandler = null;
let errorHandler = null;
/** Last successful via chain (root → leaf) — soft-nav miss uses the leaf host. */
let lastVia = [];
let defaultErrorSuppressed = false;

/**
 * Normalize configure / dock / route override values.
 * Accepts: string HTML | tag string | { tag } | { html } | null
 */
export function normalizeOverride(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    if (value.includes('-') && !value.includes('<') && value === value.toLowerCase()) {
      return { tag: value };
    }
    return { html: value };
  }
  if (typeof value === 'object') {
    if (value.tag) return { tag: value.tag, props: value.props ?? null };
    if (value.html != null) return { html: value.html };
  }
  return null;
}

/**
 * Optional app-level fallback when no dock in the chain defines the kind.
 * @param {{ notfound?: any, error?: any, offline?: any }} config
 */
export function configurePages(config = {}) {
  if (config.notfound !== undefined) appConfig.notfound = normalizeOverride(config.notfound);
  if (config.error !== undefined) appConfig.error = normalizeOverride(config.error);
  if (config.offline !== undefined) appConfig.offline = normalizeOverride(config.offline);
  return () => {
    if (config.notfound !== undefined) appConfig.notfound = null;
    if (config.error !== undefined) appConfig.error = null;
    if (config.offline !== undefined) appConfig.offline = null;
  };
}

export function setNotFound(handler) {
  notFoundHandler = handler;
  return () => {
    if (notFoundHandler === handler) notFoundHandler = null;
  };
}

export function setErrorHandler(handler) {
  errorHandler = handler;
  return () => {
    if (errorHandler === handler) errorHandler = null;
  };
}

export function suppressDefaultError(suppress = true) {
  defaultErrorSuppressed = !!suppress;
}

export function rememberVia(via) {
  if (Array.isArray(via) && via.length) lastVia = [...via];
}

export function getLastVia() {
  return lastVia;
}

export function resetPages() {
  appConfig = { notfound: null, error: null, offline: null };
  notFoundHandler = null;
  errorHandler = null;
  lastVia = [];
  defaultErrorSuppressed = false;
}

function liveContainer(name) {
  const el = getContainer(name);
  return el && el.isConnected ? el : null;
}

/** DFS: deepest live container names under main (deepest first), then main. */
function deepestLiveNames() {
  const ordered = [];
  function walk(node) {
    if (!node) return;
    for (const child of node.children) walk(child);
    if (node.name && node.name !== 'main') {
      const el = node.ref?.deref?.();
      if (el?.isConnected) ordered.push(node.name);
    }
  }
  walk(graphRoot);
  ordered.push('main');
  return ordered;
}

function readDockKind(el, kind) {
  const Cls = el?.constructor;
  if (!Cls) return null;
  if (kind === 'notfound') return Cls.notfound ?? null;
  if (kind === 'error') return Cls.error ?? null;
  if (kind === 'offline') return Cls.offline ?? null;
  return null;
}

function readRouteOverride(kind, route) {
  if (kind !== 'error' || !route) return null;
  const meta = route.meta ?? route;
  return normalizeOverride(meta?.error ?? null);
}

/**
 * Resolve leaf host + dock template override.
 * Host = deepest live in via (leaf). Template = first dock leaf→root with kind.
 */
function resolveHost(kind, viaHint = []) {
  const chain = (viaHint.length ? viaHint : lastVia).filter(Boolean);
  const leafFirst = chain.length
    ? [...chain].reverse()
    : deepestLiveNames();

  // Host: first live in leaf→root order (= deepest live in the chain)
  let host = null;
  let hostName = null;
  for (const name of leafFirst) {
    const el = liveContainer(name);
    if (el) {
      host = el;
      hostName = name;
      break;
    }
  }
  if (!host) {
    host = liveContainer('main') || document.getElementById('main');
    hostName = 'main';
  }

  // Template: walk same leaf→root; deepest dock that defines the kind
  let override = null;
  for (const name of leafFirst) {
    const el = liveContainer(name);
    if (!el) continue;
    const raw = readDockKind(el, kind);
    if (raw != null) {
      override = normalizeOverride(raw);
      break;
    }
  }

  return { host, hostName, override };
}

async function materialize(override, kind, ctx) {
  const resolved = override ?? null;

  if (resolved?.tag) {
    const tag = resolved.tag;
    if (typeof customElements !== 'undefined' && tag.includes('-') && !customElements.get(tag)) {
      await customElements.whenDefined(tag);
    }
    const el = document.createElement(tag);
    el.classList.add('page-content');
    el.setAttribute('data-fallback-kind', kind);
    if (ctx.url != null) el.url = typeof ctx.url === 'string' ? ctx.url : String(ctx.url);
    if (ctx.error) {
      el.message = ctx.error?.message ?? String(ctx.error);
      el.phase = ctx.phase ?? '';
    }
    if (resolved.props && typeof resolved.props === 'object') {
      for (const [k, v] of Object.entries(resolved.props)) el[k] = v;
    }
    return el;
  }

  const html = resolved?.html ?? DEFAULTS[kind] ?? DEFAULT_ERROR_HTML;
  const wrapper = document.createElement('div');
  wrapper.classList.add('page-content');
  wrapper.setAttribute('data-fallback-kind', kind);
  wrapper.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  wrapper.setAttribute('aria-label', ARIA[kind] ?? 'Fallback');
  wrapper.innerHTML = html;
  return wrapper;
}

/**
 * Render a fallback kind into the leaf dock of the active chain.
 * @param {'notfound'|'error'|'offline'} kind
 * @param {object} [ctx]
 */
export async function renderPageKind(kind, ctx = {}) {
  if (kind === 'error' && defaultErrorSuppressed) return;
  if (ctx.signal?.aborted) return;

  const viaHint = Array.isArray(ctx.via) ? ctx.via
    : (ctx.activeContainer ? [ctx.activeContainer] : []);
  const { host, hostName, override: dockOverride } = resolveHost(kind, viaHint);

  if (!host) return;

  clearLoading(host);

  const routeOverride = readRouteOverride(kind, ctx.route);
  // page → dock → optional app → built-in (null → DEFAULTS in materialize)
  const chosen = routeOverride ?? dockOverride ?? appConfig[kind] ?? null;

  // Optional escape hatches: return false (or void for notFound only when
  // falling through is desired) to keep page → dock → app auto-mount.
  // Prefer dock/`configure` tags; handlers are for full manual control.
  if (kind === 'notfound' && typeof notFoundHandler === 'function') {
    const result = await notFoundHandler({
      ...(ctx.event && typeof ctx.event === 'object' ? ctx.event : {}),
      ...ctx,
      host,
      hostName,
      kind,
      override: chosen
    });
    if (result !== false) return;
  }

  if (kind === 'error' && typeof errorHandler === 'function') {
    const result = await errorHandler({ ...ctx, host, hostName, kind, override: chosen });
    if (result !== false) return;
  }

  if (ctx.signal?.aborted) return;

  const node = await materialize(chosen, kind, ctx);
  if (ctx.signal?.aborted) return;

  const swapOpts = {
    direction: 'replace',
    signal: ctx.signal
  };

  if (typeof host.swap === 'function') {
    await host.swap(node, swapOpts);
  } else if (typeof host.swapView === 'function') {
    await host.swapView(node, swapOpts);
  } else {
    host.replaceChildren(node);
  }
}

/** Explicit show helper (offline banner, tests, app bridges). */
export function show(kind, ctx = {}) {
  return renderPageKind(kind, ctx);
}

export const pagesApi = {
  configure: configurePages,
  show,
  onError: setErrorHandler,
  suppressDefault: suppressDefaultError,
  notFound: setNotFound
};

export const missApi = {
  set: setNotFound,
  clear() { notFoundHandler = null; }
};

export {
  DEFAULT_NOTFOUND_HTML,
  DEFAULT_ERROR_HTML,
  DEFAULT_OFFLINE_HTML
};
