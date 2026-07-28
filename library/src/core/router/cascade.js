/**
 * src/core/router/cascade.js
 *
 * Sequential container mounting. When a navigation targets a container that is
 * not yet in the DOM, walk the graph path from the nearest live ancestor down
 * to the target, creating and mounting each missing level in order and yielding
 * a frame between each so connectedCallback (and self-registration) can run.
 *
 * Source: tasks.md Phase 5
 */

import { get, add, element as resolve } from './graph.js';
import { path } from './lca.js';

/** Yields one frame so a freshly-connected element can register itself. */
function frame() {
  if (typeof requestAnimationFrame === 'undefined') return Promise.resolve();
  return new Promise((r) => requestAnimationFrame(() => r()));
}

/**
 * Prefer a pre-rendered light-DOM child (SSG / Mode B) over createElement.
 * Avoids `replaceChildren` wiping nested open DSD when the dock is already
 * in the document but has not finished self-registering yet.
 *
 * @param {Element} parentEl
 * @param {string} tag
 * @returns {Element|null}
 */
function findChildByTag(parentEl, tag) {
  const want = tag.toLowerCase();
  for (const child of parentEl.children) {
    if (child.tagName.toLowerCase() === want) return child;
  }
  return null;
}

/**
 * Ensures `target` is mounted, cascading through any missing intermediate
 * containers from the deepest currently-mounted ancestor downward.
 *
 * @param {string} target - container name that must end up in the DOM.
 * @param {string} [current='main'] - the source container to path from.
 * @returns {Promise<Element|null>} the resolved target element.
 */
export async function ensure(target, current = 'main') {
  // Already mounted — nothing to do.
  const live = resolve(target);
  if (live) return live;

  const segments = path(current, target);
  if (!segments) {
    // The container graph has no registered path from `current` to `target`.
    // This almost always means a dock() declaration is missing or was imported
    // after the page() that lists it in `via`.
    throw new Error(
      `[Router] CascadeError: cannot mount '${target}' — no graph path from '${current}'.\n` +
      `Ensure dock('${target}', { parent: '${current}' }) is called and its file is imported\n` +
      `before any page() that lists '${target}' in its via chain.`
    );
  }

  // Find the deepest node on the path that is currently connected.
  let mounted = null;
  for (const node of segments) {
    const el = node.ref?.deref();
    if (el && el.isConnected) mounted = node;
    else break;
  }
  if (!mounted) mounted = get('main');   // fall back to the graph root

  // Mount sequentially from the first unmounted node down to the target.
  const start = segments.indexOf(mounted) + 1;
  for (let i = start; i < segments.length; i++) {
    const node = segments[i];
    if (resolve(node.name)) continue;
    const parentEl = node.parent?.ref?.deref() ?? null;
    if (!parentEl || !parentEl.isConnected) throw new Error(`CascadeError: parent '${node.parent?.name}' is disconnected while mounting '${node.name}'`);
    const tag = node.tag;
    if (tag.includes('-') && typeof customElements !== 'undefined' && !customElements.get(tag)) await customElements.whenDefined(tag);

    // Adopt SSG/Mode B dock if already in light DOM — never replaceChildren over it
    // (that would blank-flash nested DSD). Only create+swap when the level is missing.
    let el = findChildByTag(parentEl, tag);
    if (!el) {
      el = document.createElement(tag);
      parentEl.replaceChildren(el);
    } else {
      add(node.name, el, node.parent?.name ?? 'main', tag);
    }

    // Wait for the element's connectedCallback to complete, including any
    // async resource loading (template/style fetches). A single frame is
    // not sufficient when preloadResources() hits the network. Adopt path
    // usually resolves immediately via add() above.
    let attempts = 0;
    while (!resolve(node.name) && attempts < 50) {
      await frame();
      attempts++;
    }
    if (!resolve(node.name)) {
      throw new Error(`CascadeError: container '${node.name}' failed to register after mount`);
    }
  }

  return resolve(target);
}
