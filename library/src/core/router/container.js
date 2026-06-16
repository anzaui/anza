/**
 * src/core/router/container.js
 *
 * Container registry facade. Delegates storage to the hierarchical graph
 * (graph.js) while preserving the historical public API and the CSS-selector
 * fallback for containers that are plain DOM elements rather than registered
 * docks.
 *
 * Source: tasks.md Phase 3, advance2.md
 */

import { add, remove, element as graphElement, get, clear } from './graph.js';

// Selectors we are still waiting to appear in the DOM.
const observedSelectors = new Set();
let observer;

/**
 * Boots the MutationObserver to discover standard (non-dock) containers that
 * match a tracked CSS selector. Uses requestIdleCallback with a 100ms timeout
 * so it still fires under sustained animation load, falling back to
 * requestAnimationFrame where idle callbacks are unavailable (RT bug 8.1).
 */
function ensureObserver() {
  if (observer || typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;

  const attach = () => {
    if (observer) return;
    const root = document.getElementById('main');
    if (!root) return;   // framework root absent — nothing to observe

    observer = new MutationObserver(() => {
      let stillWaiting = false;
      for (const selector of observedSelectors) {
        if (!graphElement(selector)) {
          const el = root.querySelector(selector);   // scope to root, not document
          if (el) registerContainer(selector, el);
          else stillWaiting = true;
        }
      }
      if (!stillWaiting && observer) {
        observer.disconnect();
        observer = null;
      }
    });

    observer.observe(root, { childList: true, subtree: true });
  };

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(attach, { timeout: 100 });
  } else {
    requestAnimationFrame(attach);
  }
}

/**
 * Registers a layout container as actively mounted in the DOM.
 *
 * @param {string} name - unique registry key (or CSS selector).
 * @param {HTMLElement} element - the DOM element instance.
 * @param {string|null} [parent='main'] - parent container key in the graph.
 *   Pass null explicitly when registering the root (no parent).
 */
export function registerContainer(name, element, parent = 'main', tag = null) {
  add(name, element, parent, tag);
}

/**
 * Unregisters a layout container when it is removed from the DOM.
 *
 * @param {string} name - the registry key.
 * @param {HTMLElement} [element] - element guard for the safety check.
 */
export function unregisterContainer(name, element) {
  remove(name, element);
}

export function hasContainer(name) {
  return get(name) !== null;
}

/**
 * Retrieves an active layout container by name.
 *
 * A plain key (e.g. 'main') is resolved only through the graph. A CSS selector
 * (starts with '#', '.', '[', or contains a combinator) additionally resolves
 * against the document and self-registers on first hit.
 *
 * @param {string} name - the registry key or selector.
 * @returns {HTMLElement|undefined} the element, or undefined if not mounted.
 */
export function getContainer(name) {
  let el = graphElement(name);
  if (el) return el;

  if (isSelector(name) && typeof document !== 'undefined') {
    const root = document.getElementById('main');
    try {
      el = root ? root.querySelector(name) : null;
      if (el) {
        registerContainer(name, el);
        return el;
      }
      if (!observedSelectors.has(name)) observedSelectors.add(name);
      ensureObserver();
    } catch (_) {
      // Invalid selector string — ignore.
    }
    return el ?? undefined;
  }

  // Warn when a plain key shadows a real DOM element inside the root.
  if (typeof name === 'string' && typeof document !== 'undefined') {
    const root = document.getElementById('main');
    let queryResult = null;
    try { queryResult = root?.querySelector(name) ?? null; } catch (_) {}
    if (queryResult) {
      console.warn(
        `[Router] Container name "${name}" matches a DOM element inside <main id="main"> ` +
        `but is being treated as a registry key. ` +
        `Use a selector prefix or register it via registerContainer().`
      );
    }
  }

  return el ?? undefined;
}

/** Heuristic: does this string look like a CSS selector rather than a key? */
function isSelector(name) {
  return typeof name === 'string' && /^[#.\[]|[\s>+~]/.test(name);
}

/**
 * Clears the entire container registry and stops selector observation.
 */
export function clearContainers() {
  clear();
  observedSelectors.clear();
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// Re-export the graph node accessor for modules that need topology directly.
export { get as getNode };
