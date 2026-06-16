/**
 * src/core/router/graph.js
 *
 * Hierarchical container graph. Replaces the flat name->WeakRef registry with a
 * tree that knows parent/child relationships and depth, enabling lowest-common-
 * ancestor traversal (lca.js) and sequential cascade mounting (cascade.js).
 *
 * Every node holds a WeakRef to its element so an unmounted container can be
 * garbage-collected without a manual unregister. A FinalizationRegistry prunes
 * stale nodes. The virtual root 'main' always exists; its WeakRef is filled in
 * by boot.js anchor() once <main id="main"> is live in the DOM.
 *
 * Source: tasks.md Phase 3
 */

class Node {
  constructor(name, tag, ref, parent) {
    this.name = name;            // registry key, e.g. 'main' | 'sidebar'
    this.tag = tag;              // custom element tag, e.g. 'dock-docs' | 'main'
    this.ref = ref;              // WeakRef<Element> | null (null for virtual root)
    this.parent = parent;        // Node | null
    this.children = new Set();   // Set<Node>
    this.depth = parent ? parent.depth + 1 : 0;
  }

  /** @returns {boolean} true while the referenced element is still alive. */
  alive() {
    return this.ref ? this.ref.deref() !== undefined : true;
  }
}

const nodes = new Map();

// The permanent root node. ref is null at module-evaluation time because
// modules may be evaluated before the parser reaches <main id="main">.
// boot.js fills in the WeakRef during anchor().
const root = new Node('main', 'main', null, null);
root.depth = 0;
nodes.set('main', root);

// Explicit unregistrations. element() returns undefined for a name in this set
// so a just-unmounted container is not confused with a GC'd one (RT bug 8.2).
const gone = new Set();

// Prune stale nodes after their element is collected by GC.
// This is the ONLY place a node is structurally removed from the graph.
// Normal DOM disconnects (remove()) only null the ref — they preserve topology.
const finalizer = typeof FinalizationRegistry !== 'undefined'
  ? new FinalizationRegistry((name) => {
      const node = nodes.get(name);
      // Only detach if the node still has no live element (i.e. truly GC'd,
      // not just remounted under a new element instance).
      if (node && !node.alive()) detach(name);
    })
  : { register() {}, unregister() {} };

/**
 * Structurally removes a node from the tree, reparenting its children to its
 * parent. Called ONLY from the FinalizationRegistry (GC path). DOM disconnects
 * must NOT call this — they use remove() which only nulls the ref.
 */
function detach(name) {
  const node = nodes.get(name);
  if (!node || node === root) return;
  node.parent?.children.delete(node);
  for (const child of node.children) {
    child.parent = node.parent;
    child.depth = child.parent ? child.parent.depth + 1 : 0;
    node.parent?.children.add(child);
  }
  nodes.delete(name);
}

/**
 * Inserts (or re-points) a container node under a parent.
 *
 * @param {string} name - unique registry key.
 * @param {Element} el - the container element.
 * @param {string} [parent='main'] - parent registry key.
 * @param {string} [tag] - custom element tag; defaults to name.
 * @returns {Node} the inserted node.
 */
export function add(name, el, parent = 'main', tag = null) {
  gone.delete(name);

  const existing = nodes.get(name);
  if (existing) {
    if (existing === root) {
      // Root re-registration from anchor(): refresh the WeakRef and return.
      // The root cannot be reparented and must not spawn a duplicate node.
      if (el) existing.ref = new WeakRef(el);
      return existing;
    }
    const prev = existing.ref?.deref();
    if (prev && el && prev !== el) {
      throw new Error(`ContainerError: Singleton violation — '${name}' is already mounted. A second instance cannot register while the first is active.`);
    }
    // Re-registering after a disconnect (ref was null) or HMR: refresh the ref.
    // Also re-register with the finalizer so the new element instance is tracked.
    if (el) {
      existing.ref = new WeakRef(el);
      finalizer.register(el, name);
    }
    return existing;
  }

  const parentNode = nodes.get(parent) ?? root;
  const resolvedTag = tag || name;
  const node = new Node(name, resolvedTag, el ? new WeakRef(el) : null, parentNode);
  parentNode.children.add(node);
  nodes.set(name, node);
  if (el) finalizer.register(el, name);
  return node;
}

/**
 * Unregisters the live element of a container node when the element disconnects
 * from the DOM. The node itself stays in `nodes` to preserve graph topology for
 * future ensure()/lca() calls — only its element ref is cleared.
 *
 * The name is marked `gone` for one macrotask so any lookup that races the
 * disconnect (e.g. an in-flight navigation reading the old element) gets
 * `undefined` rather than the stale ref.
 *
 * Structural removal (nodes.delete) is deferred to the FinalizationRegistry so
 * it only happens after the element is truly GC'd and cannot be remounted.
 *
 * @param {string} name - registry key.
 * @param {Element} [el] - element guard; if given, only clears when it matches.
 */
export function remove(name, el) {
  const node = nodes.get(name);
  if (!node || node === root) return;

  const current = node.ref?.deref();
  // Guard: if a specific element is given and it doesn't match the registered
  // one, this is a stale disconnect from a previous instance — ignore.
  if (el && current && current !== el) return;

  // Unregister from the finalizer (we're clearing the ref manually).
  if (current) {
    try { finalizer.unregister(current); } catch (_) {}
  }

  // Clear the element ref but KEEP the node in the graph.
  // This preserves topology: lca() and path() can still traverse the tree
  // on the next navigation that needs to remount this container.
  node.ref = null;

  // Mark as transiently gone for one macrotask.
  gone.add(name);
  if (typeof setTimeout !== 'undefined') {
    setTimeout(() => gone.delete(name), 0);
  }
}

/**
 * @param {string} name - registry key.
 * @returns {Node|null} the node, or null if absent.
 */
export function get(name) {
  return nodes.get(name) ?? null;
}

/**
 * Resolves a node's live element.
 *
 * @param {string} name - registry key.
 * @returns {Element|null|undefined} element, null if absent,
 *   or undefined if the name was just explicitly removed.
 */
export function element(name) {
  if (gone.has(name)) return undefined;
  const node = nodes.get(name);
  if (!node) return null;
  return node.ref ? (node.ref.deref() ?? null) : null;
}

/** Resets the graph to root-only. */
export function clear() {
  nodes.clear();
  root.children.clear();
  gone.clear();
  root.ref = null;           // reset the WeakRef so anchor() re-queries on next boot
  nodes.set('main', root);   // root is 'main'; 'body' has no special status
}

export { Node, root };
