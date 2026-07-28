/**
 * src/core/ui/transitions.js
 *
 * View Transitions for soft-nav docks and ad-hoc DOM swaps.
 *
 * Dock / container swaps prefer element-scoped `host.startViewTransition`
 * so chrome (sidebar, header, parent docks) stays out of the snapshot.
 * When that API, document VT, or motion is unavailable — or the call is
 * aborted — the update runs as a direct swap (no broken UX).
 *
 * CSS controls look via `view-transition-name` groups + semantic tokens;
 * JS controls opt-in/out, names, direction, and AbortSignal lifetime.
 */

const DEFAULT_DOCK_NAME = 'dock-swap';

/** @type {{ enabled: boolean, nameFor: Function }} */
const config = {
  enabled: true,
  /**
   * Resolve the CSS view-transition-name for a swap host.
   * @param {Element} el
   * @param {{ dockName?: string, name?: string }} [hint]
   */
  nameFor(el, hint = {}) {
    if (hint.name) return String(hint.name);
    const fromDataset = el?.dataset?.transitionName;
    if (fromDataset) return fromDataset;
    const fromAttr = el?.getAttribute?.('view-transition-name');
    if (fromAttr) return fromAttr;
    if (hint.dockName) {
      const key = String(hint.dockName);
      return key.startsWith('dock-') ? key : `dock-${key}`;
    }
    const tag = el?.localName || el?.tagName?.toLowerCase?.();
    if (tag && tag.startsWith('dock-')) return tag;
    return DEFAULT_DOCK_NAME;
  }
};

function abortError(reason) {
  if (reason instanceof DOMException && reason.name === 'AbortError') return reason;
  return new DOMException(String(reason ?? 'Aborted'), 'AbortError');
}

/**
 * @param {Partial<typeof config>} partial
 */
export function configureTransitions(partial = {}) {
  if (partial.enabled != null) config.enabled = !!partial.enabled;
  if (typeof partial.nameFor === 'function') config.nameFor = partial.nameFor;
}

/** Snapshot of current global transition settings. */
export function getTransitionConfig() {
  return {
    enabled: config.enabled,
    nameFor: config.nameFor
  };
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function hasDocumentViewTransition() {
  return typeof document !== 'undefined'
    && typeof document.startViewTransition === 'function';
}

export function hasElementViewTransition(el) {
  return !!el && typeof el.startViewTransition === 'function';
}

/**
 * Whether a VT should run for this call (global + options + motion + API).
 * @param {object} [options]
 * @param {'document'|'element'} [options.scope]
 * @param {Element} [options.element]
 * @param {boolean} [options.enabled]
 * @param {boolean} [options.skip]
 * @param {AbortSignal} [options.signal]
 */
export function shouldAnimate(options = {}) {
  if (options.skip === true) return false;
  if (options.enabled === false) return false;
  if (!config.enabled) return false;
  if (options.signal?.aborted) return false;
  if (prefersReducedMotion()) return false;

  if (options.scope === 'element') {
    return hasElementViewTransition(options.element);
  }
  return hasDocumentViewTransition();
}

/**
 * Fallback / skipped transition shape — matches ViewTransition surface enough
 * for callers that await `finished` / call `skipTransition`.
 * @param {*} result
 */
function skippedTransition(result) {
  const done = Promise.resolve(result);
  // Reject intentionally, but attach a no-op catch so unused `ready` does not
  // surface as an unhandled rejection in tests / soft-nav.
  const ready = Promise.reject(new Error('View Transitions skipped or unsupported'));
  ready.catch(() => {});
  return {
    finished: done,
    updateCallbackDone: done,
    ready,
    skipTransition() {}
  };
}

/**
 * Apply directional easing tokens for the duration of a swap.
 * @param {string} [direction]
 * @returns {() => void}
 */
function applyDirectionalEasing(direction) {
  if (typeof document === 'undefined' || !direction) return () => {};

  const root = document.documentElement;
  const style = getComputedStyle(root);
  const easing = direction === 'pop' || direction === 'back'
    ? style.getPropertyValue('--transition-pop').trim()
    : direction === 'replace'
      ? style.getPropertyValue('--transition-replace').trim()
      : style.getPropertyValue('--transition-push').trim();

  if (!easing) return () => {};

  const prior = style.getPropertyValue('--transition-easing').trim();
  root.style.setProperty('--transition-easing', easing);
  return () => {
    if (prior) root.style.setProperty('--transition-easing', prior);
    else root.style.removeProperty('--transition-easing');
  };
}

/**
 * Wire AbortSignal → skipTransition; returns disposer.
 * @param {AbortSignal|undefined} signal
 * @param {{ skipTransition?: Function }|null} tx
 */
function bindAbort(signal, tx) {
  if (!signal || !tx) return () => {};
  if (signal.aborted) {
    try { tx.skipTransition?.(); } catch (_) {}
    return () => {};
  }
  const onAbort = () => {
    try { tx.skipTransition?.(); } catch (_) {}
  };
  signal.addEventListener('abort', onAbort, { once: true });
  return () => signal.removeEventListener('abort', onAbort);
}

/**
 * Skip an in-flight transition stored on a host (`host._tx`).
 * @param {Element} host
 */
export function skipHostTransition(host) {
  const tx = host?._tx;
  if (tx && typeof tx.skipTransition === 'function') {
    try { tx.skipTransition(); } catch (_) {}
  }
  if (host) host._tx = null;
}

/**
 * Document- or element-scoped View Transition around a DOM update.
 * Falls back to direct invocation when unsupported, reduced-motion, skipped,
 * disabled, or aborted before start.
 *
 * @param {() => (void|Promise<void>)} updateDOM
 * @param {object} [options]
 * @returns {Promise<object>} ViewTransition-like object
 */
export async function transition(updateDOM, options = {}) {
  const {
    scope = 'document',
    element = null,
    name,
    sourceElement,
    sourceName = 'selected-item',
    direction,
    signal
  } = options;

  if (signal?.aborted) {
    throw abortError(signal.reason);
  }

  const restoreEasing = applyDirectionalEasing(direction);
  const namedSource = sourceElement instanceof HTMLElement ? sourceElement : null;
  let hostNameApplied = false;
  let sourceNameApplied = false;

  const cleanupNames = () => {
    if (hostNameApplied && element instanceof HTMLElement) {
      element.style.viewTransitionName = '';
      hostNameApplied = false;
    }
    if (sourceNameApplied && namedSource) {
      namedSource.style.viewTransitionName = '';
      sourceNameApplied = false;
    }
  };

  const runDirect = async () => {
    try {
      const result = await updateDOM();
      return skippedTransition(result);
    } finally {
      cleanupNames();
      restoreEasing();
    }
  };

  const animate = shouldAnimate({
    ...options,
    scope,
    element: scope === 'element' ? element : undefined
  });

  if (!animate) {
    return runDirect();
  }

  try {
    if (scope === 'element' && name && element instanceof HTMLElement) {
      element.style.viewTransitionName = name;
      hostNameApplied = true;
    }
    if (namedSource) {
      namedSource.style.viewTransitionName = sourceName;
      sourceNameApplied = true;
    }

    const starter = scope === 'element'
      ? element.startViewTransition.bind(element)
      : document.startViewTransition.bind(document);

    const tx = starter(() => {
      const res = updateDOM();
      if (res instanceof Promise) return res;
    });

    const unbind = bindAbort(signal, tx);

    try {
      await tx.finished;
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.warn('[UI] View Transition aborted or failed:', err);
      }
    } finally {
      unbind();
      cleanupNames();
      restoreEasing();
    }

    return tx;
  } catch (err) {
    // API threw before/during start — never leave callers without a swap.
    cleanupNames();
    restoreEasing();
    if (err?.name === 'AbortError') throw err;
    console.warn('[UI] View Transition failed; falling back to direct update:', err);
    return runDirect();
  }
}

/**
 * Concurrent-safe dock/container swap with element-scoped VT + direct fallback.
 * Never uses document-level VT (that would snapshot sidebar/header chrome).
 *
 * @param {Element} host - dock / container element
 * @param {() => (void|Promise<void>)} updateDOM - typically replaceChildren
 * @param {object} [options]
 * @param {string} [options.direction='push']
 * @param {string} [options.name] - view-transition-name override
 * @param {string} [options.dockName] - registry key (`main`, `docs`, `content`)
 * @param {boolean|object} [options.transition] - false to skip; `{ name, skip, enabled }`
 * @param {boolean} [options.skip]
 * @param {boolean} [options.enabled]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>}
 */
export async function runSwapTransition(host, updateDOM, options = {}) {
  const {
    direction = 'push',
    dockName,
    signal
  } = options;

  if (signal?.aborted) {
    throw abortError(signal.reason);
  }

  // Parse transition option: false | true | { name, skip, enabled }
  const tOpt = options.transition;
  const skip = options.skip === true
    || tOpt === false
    || (tOpt && typeof tOpt === 'object' && tOpt.skip === true);
  const enabled = options.enabled !== false
    && tOpt !== false
    && !(tOpt && typeof tOpt === 'object' && tOpt.enabled === false);
  const nameHint = (tOpt && typeof tOpt === 'object' && tOpt.name)
    || options.name
    || undefined;

  const name = config.nameFor(host, { dockName, name: nameHint });

  if (host instanceof HTMLElement) {
    host.dataset.transitionDirection = direction;
  }

  const clearDirection = () => {
    if (host instanceof HTMLElement) delete host.dataset.transitionDirection;
  };

  const go = async () => {
    try {
      await updateDOM();
    } finally {
      clearDirection();
    }
  };

  skipHostTransition(host);

  const useElementVt = enabled
    && !skip
    && config.enabled
    && !prefersReducedMotion()
    && hasElementViewTransition(host)
    && !signal?.aborted;

  if (!useElementVt) {
    await go();
    return skippedTransition(undefined);
  }

  const restoreEasing = applyDirectionalEasing(direction);
  let nameApplied = false;

  try {
    if (host instanceof HTMLElement && name) {
      host.style.viewTransitionName = name;
      nameApplied = true;
    }

    const tx = host.startViewTransition(go);
    host._tx = tx;
    const unbind = bindAbort(signal, tx);

    try {
      await tx.finished;
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.warn('[UI] dock scoped VT aborted:', err);
      }
    } finally {
      unbind();
      host._tx = null;
      if (nameApplied) host.style.viewTransitionName = '';
      restoreEasing();
    }

    return tx;
  } catch (err) {
    host._tx = null;
    if (nameApplied && host instanceof HTMLElement) {
      host.style.viewTransitionName = '';
    }
    restoreEasing();
    clearDirection();
    if (err?.name === 'AbortError') throw err;
    console.warn('[UI] dock scoped VT failed; falling back to direct swap:', err);
    await go();
    return skippedTransition(undefined);
  }
}

/**
 * Resolve the default CSS name for a dock registry key / host.
 * @param {Element} [el]
 * @param {string|{ dockName?: string, name?: string }} [dockNameOrHint]
 */
export function dockTransitionName(el, dockNameOrHint) {
  if (dockNameOrHint != null && typeof dockNameOrHint === 'object') {
    return config.nameFor(el, dockNameOrHint);
  }
  return config.nameFor(el, { dockName: dockNameOrHint });
}
