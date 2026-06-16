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

// Element-scoped containment so View Transitions are isolated to the dock.
const CONTAIN = ':host { contain: layout; display: block; }';

/**
 * @param {string} name - unique key in the container graph (e.g. 'main').
 * @param {object} [config]
 * @param {string} [config.tag] - tag name; defaults to `dock-<name>`.
 * @param {string} [config.parent='body'] - parent dock key in the graph.
 * @param {object} [config.template] - { html, css, shadow }.
 * @param {string|object} [config.notfound] - fallback rendered when a 404
 *   lands in this dock. Pass a raw HTML string or { html } object.
 *   The deepest configured dock wins at runtime.
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
  if (Cls && !Cls.prototype.swap) {
    Object.defineProperty(Cls.prototype, 'swap', { value: swap, configurable: true });
  }
  // Back-compat alias for the legacy orchestrator/container API.
  if (Cls && !Cls.prototype.swapView) {
    Object.defineProperty(Cls.prototype, 'swapView', { value: swap, configurable: true });
  }

  // Store user-supplied notfound template on the class as a static property.
  // intercept.js reads Cls.notfound when rendering 404 fallbacks.
  if (Cls && config.notfound != null) {
    const nf = config.notfound;
    Cls.notfound = typeof nf === 'string' ? nf : (nf?.html ?? null);
  }
}

/**
 * Replaces child content under a view transition. Concurrent-safe: an in-flight
 * transition is skipped before a new one starts so rapid navigations don't
 * leave a half-finished animation (RT bug 8.4).
 */
async function swap(el, options = {}) {
  const { direction = 'push' } = options;
  this.dataset.transitionDirection = direction;

  const go = () => {
    this.replaceChildren(el);
    delete this.dataset.transitionDirection;
  };

  // Abort any transition still running on this dock.
  if (this._tx && typeof this._tx.skipTransition === 'function') {
    try { this._tx.skipTransition(); } catch (_) {}
  }

  // Read directional easing from tokens and temporarily override the root
  // variable so the injected VT stylesheet picks it up.
  let prior;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const easing = direction === 'pop'
      ? style.getPropertyValue('--transition-pop').trim()
      : style.getPropertyValue('--transition-push').trim();
    if (easing) {
      prior = style.getPropertyValue('--transition-easing').trim();
      root.style.setProperty('--transition-easing', easing);
    }
  }

  function restore() {
    if (prior !== undefined && typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--transition-easing', prior);
    }
  }

  // Only use element-scoped view transitions. If the browser doesn't support
  // this.startViewTransition (Chrome < 147), fall back to a direct synchronous
  // swap. Document-level startViewTransition() captures the entire page and
  // causes the sidebar/header to flicker — we never want that.
  if (typeof this.startViewTransition === 'function') {
    try {
      // Assign a named view-transition so CSS can target this element's
      // group explicitly, keeping the root group stable.
      this.style.viewTransitionName = 'dock-swap';
      this._tx = this.startViewTransition(go);
      await this._tx.finished;
    } catch (err) {
      if (err?.name !== 'AbortError') console.warn('[Native UI] dock scoped VT aborted:', err);
    } finally {
      this._tx = null;
      this.style.viewTransitionName = '';
      restore();
    }
    return;
  }

  go();
  restore();
}
