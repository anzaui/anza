/**
 * Shared event-target matching for `events.delegate` and component `on`.
 * Resolves the intended node from `composedPath()` within a chosen root.
 */

const matchesCache = new WeakMap();

/**
 * Cached `element.matches(selector)`.
 */
export function matchesSelector(element, selector) {
  if (!element || typeof element.matches !== 'function') {
    return false;
  }

  let selectorMap = matchesCache.get(element);
  if (!selectorMap) {
    selectorMap = new Map();
    matchesCache.set(element, selectorMap);
  }

  if (selectorMap.has(selector)) {
    return selectorMap.get(selector);
  }

  let result = false;
  try {
    result = element.matches(selector);
  } catch {
    result = false;
  }
  selectorMap.set(selector, result);
  return result;
}

/**
 * True when `node` is inside `root` for the given scope.
 * - `shadow` (default for component `on`): `root.contains(node)` (shadow-tree only)
 * - `assigned`: also allow light-DOM nodes assigned to a slot in this shadow
 * - `path`: any node in composedPath before root (no containment; used by events.delegate)
 */
export function isInRootScope(node, root, scope = 'shadow') {
  if (!node || !root) return false;
  if (node === root) return false;

  if (scope === 'path') return true;

  if (typeof root.contains === 'function' && root.contains(node)) return true;

  if (scope === 'assigned' && node.nodeType === Node.ELEMENT_NODE) {
    const slot = node.assignedSlot;
    return Boolean(slot && typeof root.contains === 'function' && root.contains(slot));
  }

  return false;
}

/**
 * Walk `composedPath()` and return the first element matching `selector`
 * before `root` (exclusive).
 *
 * @param {string} [scope='path'] - `path` | `shadow` | `assigned`
 */
export function matchInComposedPath(event, selector, root, scope = 'path') {
  if (!selector || !root) return null;

  const path = typeof event.composedPath === 'function'
    ? event.composedPath()
    : [];

  for (const node of path) {
    if (node === root) break;
    if (node?.nodeType !== Node.ELEMENT_NODE) continue;
    if (!matchesSelector(node, selector)) continue;
    if (!isInRootScope(node, root, scope)) continue;
    return node;
  }

  return null;
}

/**
 * Optional attribute predicates on the matched element.
 * `attrs[name] === null` means the attribute must be absent.
 */
export function matchesAttrs(element, attrs) {
  if (!attrs || typeof attrs !== 'object') return true;

  for (const [name, expected] of Object.entries(attrs)) {
    if (expected === null) {
      if (element.hasAttribute(name)) return false;
    } else if (element.getAttribute(name) !== String(expected)) {
      return false;
    }
  }

  return true;
}

/**
 * Skip when `match.closest(notSelector)` is within `root`.
 */
export function isExcludedByNot(match, notSelector, root) {
  if (!notSelector || !match) return false;
  try {
    const excluded = match.closest(notSelector);
    if (!excluded) return false;
    if (excluded === root) return false;
    return typeof root.contains === 'function' && root.contains(excluded);
  } catch {
    return false;
  }
}

/** Event types that default to passive: true (aligned with `events.listen`). */
export const PASSIVE_DEFAULT_TYPES = new Set([
  'touchstart',
  'touchmove',
  'wheel',
  'mousewheel'
]);

export function resolvePassiveDefault(eventType, optionsPassive) {
  if (optionsPassive !== undefined) return Boolean(optionsPassive);
  return PASSIVE_DEFAULT_TYPES.has(String(eventType));
}
