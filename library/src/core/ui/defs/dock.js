/**
 * src/core/ui/defs/dock.js
 *
 * `dock(name, config)` — a persistent container shell. It lives across route
 * changes, registers its position in the hierarchical container graph the
 * moment it connects, declares its parent dock (for LCA + cascade), and exposes
 * a `swap` method the router calls to replace child content with a view
 * transition. Replaces `<route-outlet>`.
 *
 * Source: definations.md §4, tasks.md Phase 6
 */

import { element } from '../define/element.js';
import { gate } from '../../router/boot.js';
import { router } from '../../router/index.js';
import { translate } from './spec.js';
import { runSwapTransition, dockTransitionName } from '../transitions.js';

// Element-scoped containment so View Transitions are isolated to the dock.
const CONTAIN = ':host { contain: layout; display: block; }';

/**
 * Store fallback override on the dock class (string | { tag } | { html }).
 * pages.js reads these; deepest configured live dock wins.
 */
function assignFallback(Cls, key, value) {
  if (!Cls || value == null) return;
  Cls[key] = value;
}

/**
 * @param {string} name - unique key in the container graph (e.g. 'main').
 * @param {object} [config]
 * @param {string} [config.tag] - tag name; defaults to `dock-<name>`.
 * @param {string} [config.parent='body'] - parent dock key in the graph.
 * @param {object} [config.template] - { html, css, shadow }.
 * @param {boolean|object} [config.transition] - VT opt-in/out / naming.
 *   `false` disables; `{ name, enabled }` overrides the default `dock-<name>`.
 * @param {string|object} [config.notfound] - 404 fallback for this dock.
 *   String HTML, `{ html }`, `{ tag: 'page-not-found' }`, or tag string.
 * @param {string|object} [config.error] - 5xx-class fallback (same shapes).
 * @param {string|object} [config.offline] - offline fallback (same shapes).
 * @param {string|object|false} [config.loading] - soft-nav loading UI for this dock.
 *   Omit to use the built-in `.anza-loading` spinner (or app `router.loading.configure`).
 *   Set `false` to disable for this subtree. Shapes: `{ tag }`, `{ html }`, or tag string.
 *   Deepest dock in via that defines loading wins (after page-level override).
 * @param {string} [base] - import.meta.url of the caller (file templates).
 */
export function dock(name, config = {}, base) {
  const tag = config.tag ?? `dock-${name}`;
  const parent = config.parent ?? 'main';

  // Statically register the layout container in the graph with a null element
  router.registerContainer(name, null, parent, tag);

  const spec = translate(config);

  // Default passthrough template — a dock is a shell around its slotted content.
  if (spec.template == null) spec.template = '<slot></slot>';
  // Prepend containment styling to whatever the dock declares.
  if (spec.style != null) {
    spec.style = Array.isArray(spec.style) ? [CONTAIN, ...spec.style] : [CONTAIN, spec.style];
  } else {
    spec.style = CONTAIN;
  }

  // Register in the graph on connect, unregister on disconnect. Wrap any
  // user-supplied connect/disconnect rather than clobbering them.
  const userMount = spec.mount;
  spec.mount = (ctx) => {
    router.registerContainer(name, ctx.el, parent, tag);
    return userMount?.(ctx);
  };
  const userUnmount = spec.unmount;
  spec.unmount = (ctx) => {
    router.unregisterContainer(name, ctx.el);
    return userUnmount?.(ctx);
  };

  element(tag, spec, base);
  gate(customElements.whenDefined(tag));

  // Install the swap interface used by the orchestrator and cascade.
  const Cls = customElements.get(tag);
  if (Cls) {
    Cls.dockName = name;
    Cls.transitionConfig = config.transition === undefined ? true : config.transition;
    // Default CSS group: dock-main / dock-docs / dock-content (or config override).
    if (typeof config.transition === 'object' && config.transition?.name) {
      Cls.transitionName = config.transition.name;
    } else {
      Cls.transitionName = dockTransitionName(null, name);
    }

    if (!Cls.prototype.swap) {
      Object.defineProperty(Cls.prototype, 'swap', { value: swap, configurable: true });
    }
    // Back-compat alias for the legacy orchestrator/container API.
    if (!Cls.prototype.swapView) {
      Object.defineProperty(Cls.prototype, 'swapView', { value: swap, configurable: true });
    }
  }

  assignFallback(Cls, 'notfound', config.notfound);
  assignFallback(Cls, 'error', config.error);
  assignFallback(Cls, 'offline', config.offline);

  if (Cls) {
    if (config.loading === false) {
      Cls.loadingDisabled = true;
      Cls.loading = undefined;
    } else if (config.loading != null) {
      Cls.loadingDisabled = false;
      Cls.loading = config.loading;
    }
  }
}

/**
 * Replaces child content under a view transition. Concurrent-safe: an in-flight
 * transition is skipped before a new one starts so rapid navigations don't
 * leave a half-finished animation (RT bug 8.4).
 *
 * Options:
 * - `direction` — `'push' | 'pop' | 'replace'` (token easing + data attr)
 * - `transition` — `false` to skip VT; `{ name, skip, enabled }` for control
 * - `name` — override view-transition-name for this swap
 * - `signal` — AbortSignal (soft-nav / leaf teardown); aborts in-flight VT
 */
async function swap(el, options = {}) {
  const Cls = this.constructor;
  const dockName = Cls.dockName;
  const classTx = Cls.transitionConfig;

  // Class-level disable wins unless the call explicitly re-enables.
  const transitionOpt = options.transition !== undefined
    ? options.transition
    : classTx;

  return runSwapTransition(this, () => {
    // Keep soft-nav `.dock-loading` until orchestrator ends loading on anza:ready.
    const kept = [];
    for (const child of this.children) {
      if (child.classList?.contains('dock-loading')) kept.push(child);
    }
    this.replaceChildren(...kept, el);
  }, {
    direction: options.direction ?? 'push',
    dockName,
    name: options.name ?? Cls.transitionName,
    transition: transitionOpt,
    skip: options.skip,
    enabled: options.enabled,
    signal: options.signal
  });
}
