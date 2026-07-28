/**
 * Internal framework-global listener/observer registry.
 * App code should prefer component `on` / `watch` / `events.*` with AbortSignal.
 * Soft-nav and unit tests assert `globals.count()` stays stable across navigations.
 *
 * @see plans/MUTATIONS-EVENTS.md Phase 4
 */

const entries = new Map();

/**
 * Register a named framework attachment. Replacing the same name disposes the prior entry.
 *
 * @param {string} name - Stable id, e.g. `router.nav-click`, `router.container-mo`.
 * @param {{ type: 'listener'|'observer', target?: EventTarget|Node, dispose: Function }} entry
 */
export function attach(name, entry) {
  if (typeof name !== 'string' || !name) {
    throw new Error('[Anza] globals.attach requires a non-empty name');
  }
  if (typeof entry?.dispose !== 'function') {
    throw new Error('[Anza] globals.attach requires a dispose function');
  }

  const prev = entries.get(name);
  if (prev) {
    try {
      prev.dispose();
    } catch {
      // ignore double-dispose
    }
  }

  entries.set(name, {
    name,
    type: entry.type === 'observer' ? 'observer' : 'listener',
    target: entry.target ?? null,
    dispose: entry.dispose
  });
}

/**
 * Detach and dispose a named attachment (idempotent).
 */
export function detach(name) {
  const entry = entries.get(name);
  if (!entry) return;
  entries.delete(name);
  try {
    entry.dispose();
  } catch {
    // ignore
  }
}

/**
 * @returns {number} Active framework-global attachments.
 */
export function count() {
  return entries.size;
}

/**
 * Snapshot for tests / diagnostics (does not dispose).
 * @returns {Array<{ name: string, type: string, target: unknown }>}
 */
export function list() {
  return Array.from(entries.values()).map(({ name, type, target }) => ({
    name,
    type,
    target
  }));
}

/**
 * Test helper — dispose everything. Prefer detach of specific names in production.
 */
export function clear() {
  for (const name of Array.from(entries.keys())) {
    detach(name);
  }
}

export const globals = {
  attach,
  detach,
  count,
  list,
  clear
};

export default globals;
