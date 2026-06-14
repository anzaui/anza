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

import { get, element as resolve } from './graph.js';
import { path } from './lca.js';

/** Yields one frame so a freshly-connected element can register itself. */
function frame() {
  if (typeof requestAnimationFrame === 'undefined') return Promise.resolve();
  return new Promise((r) => requestAnimationFrame(() => r()));
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
  if (!segments) throw new Error(`CascadeError: no path '${current}' → '${target}'`);

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
    const tag = node.name;
    if (tag.includes('-') && typeof customElements !== 'undefined' && !customElements.get(tag)) await customElements.whenDefined(tag);
    const el = document.createElement(tag);
    parentEl.replaceChildren(el);
    await frame();
    if (!resolve(node.name)) throw new Error(`CascadeError: container '${node.name}' failed to register after mount`);
  }

  return resolve(target);
}
