/**
 * src/core/router/loading.js
 *
 * Per-dock loading UI during soft-nav network work (template/style fetches).
 *
 * Precedence (highest → lowest):
 *   1. Page-level page({ loading })
 *   2. Dock chain leaf→root (deepest dock that defines loading)
 *   3. Optional app router.loading.configure({ … })
 *   4. Built-in minimal spinner (inline HTML + tokens)
 *
 * Set `loading: false` on a dock to disable for that subtree.
 */

import { getContainer } from './container.js';
import { specRegistry } from '../ui/define/state.js';
import { normalizeOverride } from './pages.js';

const DEFAULT_LOADING_HTML = `
  <div class="anza-loading" role="status" aria-label="Loading" aria-live="polite">
    <div class="anza-loading__ring" aria-hidden="true"></div>
  </div>
`;

/** Navigation kinds that already have (or should keep) document content visible. */
function isBootNavigation(direction) {
  return direction === 'load' || direction === 'reload';
}

/** Inject fallback loading CSS when shell did not link styles/loading.css. Idempotent. */
export function ensureLoadingStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('anza-loading-style')) return;
  const style = document.createElement('style');
  style.id = 'anza-loading-style';
  style.textContent = `
    [data-loading]{position:relative}
    [data-loading]>.dock-loading,.anza-loading{display:flex;align-items:center;justify-content:center;min-height:12rem;padding:2rem;width:100%}
    .anza-loading__ring{width:2rem;height:2rem;border-radius:50%;border:2px solid color-mix(in srgb,var(--color-content-secondary,#888) 25%,transparent);border-top-color:var(--color-interactive,currentColor);animation:anza-loading-spin .7s linear infinite}
    @keyframes anza-loading-spin{to{transform:rotate(360deg)}}
    @media (prefers-reduced-motion:reduce){.anza-loading__ring{animation:none;opacity:.6}}
  `;
  document.head.appendChild(style);
}

/** @type {any} */
let appConfig = null;
let navGeneration = 0;

/** @type {WeakMap<Element, { gen: number, node: Element, ac: AbortController }>} */
const activeByHost = new WeakMap();

export function normalizeLoading(value) {
  if (value === false) return { disabled: true };
  if (value == null) return null;
  if (typeof value === 'object' && value.disabled === true) return { disabled: true };
  const normalized = normalizeOverride(value);
  if (!normalized) return null;
  return normalized;
}

/**
 * Optional app-level loading default when no dock/page defines it.
 * Accepts the same shapes as dock/page `loading`, or `{ loading: … }`.
 * @param {any} config
 */
export function configureLoading(config = {}) {
  const value = (config && typeof config === 'object' && 'loading' in config)
    ? config.loading
    : config;
  appConfig = normalizeLoading(value);
  return () => {
    appConfig = null;
  };
}

export function resetLoading() {
  appConfig = null;
  navGeneration = 0;
}

function liveContainer(name) {
  const el = getContainer(name);
  return el && el.isConnected ? el : null;
}

function readDockLoading(el) {
  const Cls = el?.constructor;
  if (!Cls) return undefined;
  if (Cls.loadingDisabled) return { disabled: true };
  return Cls.loading ?? null;
}

function readPageLoading(tag) {
  if (!tag) return null;
  const spec = specRegistry.get(tag.toLowerCase());
  return spec?.loading ?? null;
}

/**
 * Resolve leaf host + loading override for an active via chain.
 * @param {string[]} viaHint
 * @param {string} [pageTag]
 */
export function resolveLoading(viaHint = [], pageTag = null) {
  const chain = viaHint.filter(Boolean);
  const leafFirst = [...chain].reverse();

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

  let override = readPageLoading(pageTag);
  if (override == null) {
    for (const name of leafFirst) {
      const el = liveContainer(name);
      if (!el) continue;
      const raw = readDockLoading(el);
      if (raw === undefined || raw === null) continue;
      override = normalizeLoading(raw);
      break;
    }
  } else {
    override = normalizeLoading(override);
  }

  if (override == null) override = appConfig ?? null;
  if (override?.disabled) return { host, hostName, override: null, disabled: true };

  return { host, hostName, override, disabled: false };
}

async function materializeLoading(override) {
  const resolved = override ?? null;

  if (resolved?.tag) {
    const tag = resolved.tag;
    if (typeof customElements !== 'undefined' && tag.includes('-') && !customElements.get(tag)) {
      await customElements.whenDefined(tag);
    }
    const el = document.createElement(tag);
    el.classList.add('dock-loading');
    el.setAttribute('data-loading-kind', 'nav');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    if (resolved.props && typeof resolved.props === 'object') {
      for (const [k, v] of Object.entries(resolved.props)) el[k] = v;
    }
    return el;
  }

  const wrapper = document.createElement('div');
  wrapper.classList.add('dock-loading');
  wrapper.setAttribute('data-loading-kind', 'nav');
  wrapper.setAttribute('role', 'status');
  wrapper.setAttribute('aria-live', 'polite');
  wrapper.innerHTML = (resolved?.html ?? DEFAULT_LOADING_HTML).trim();

  ensureLoadingStyles();

  return wrapper;
}

/**
 * Begin loading UI for a soft-nav into `via`. Returns { gen, host, hostName }.
 * Skips when `direction` is boot/reload (hard refresh / SSG already in document).
 */
export async function beginLoading(via = [], pageTag = null, direction = 'push') {
  if (isBootNavigation(direction)) {
    return { gen: navGeneration, host: null, hostName: null, skipped: true };
  }

  const { host, hostName, override, disabled } = resolveLoading(via, pageTag);
  if (!host || disabled) {
    return { gen: navGeneration, host, hostName, skipped: true };
  }

  navGeneration += 1;
  const gen = navGeneration;

  const prev = activeByHost.get(host);
  if (prev) {
    prev.ac.abort();
    prev.node.remove();
    activeByHost.delete(host);
  }

  const ac = new AbortController();
  const node = await materializeLoading(override);
  if (ac.signal.aborted) return { gen, host, hostName, skipped: true };

  host.setAttribute('data-loading', '');
  host.setAttribute('aria-busy', 'true');
  host.appendChild(node);
  activeByHost.set(host, { gen, node, ac });

  return { gen, host, hostName, skipped: false };
}

/**
 * End loading for a host if `gen` is still current (not superseded).
 */
export function endLoading(host, gen) {
  if (!host) return;
  const state = activeByHost.get(host);
  if (!state || state.gen !== gen) return;

  state.ac.abort();
  state.node.remove();
  activeByHost.delete(host);

  if (!host.querySelector('.dock-loading')) {
    host.removeAttribute('data-loading');
    host.removeAttribute('aria-busy');
  }
}

/** Force-clear loading on a host (tests / manual). */
export function clearLoading(hostOrName) {
  const host = typeof hostOrName === 'string'
    ? (liveContainer(hostOrName) || document.getElementById(hostOrName))
    : hostOrName;
  if (!host) return;

  const state = activeByHost.get(host);
  if (state) {
    state.ac.abort();
    state.node.remove();
    activeByHost.delete(host);
  }
  host.querySelectorAll('.dock-loading').forEach((n) => n.remove());
  host.removeAttribute('data-loading');
  host.removeAttribute('aria-busy');
}

/**
 * Wait for a page element to finish resource load + mount.
 * @param {HTMLElement} el
 * @param {AbortSignal} [signal]
 */
export function waitForPageReady(el, signal) {
  if (!el || !el.isConnected) return Promise.resolve();
  if (signal?.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    const done = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      clearTimeout(timer);
      el.removeEventListener('anza:ready', onReady);
      signal?.removeEventListener('abort', done);
    };
    const onReady = () => done();

    const timer = setTimeout(done, 15000);
    el.addEventListener('anza:ready', onReady, { once: true });
    signal?.addEventListener('abort', done, { once: true });
  });
}

export const loadingApi = {
  configure: configureLoading,
  show: beginLoading,
  hide: endLoading,
  clear: clearLoading,
  ensureStyles: ensureLoadingStyles
};

if (typeof document !== 'undefined') {
  ensureLoadingStyles();
}
