import {
  isExcludedByNot,
  matchInComposedPath,
  matchesAttrs,
  resolvePassiveDefault
} from '../../events/match.js';

/** Per-shadowRoot attachment counters for DEV / soft-nav leak tests. */
const attachmentStats = new WeakMap();

/**
 * Snapshot of live `on` / `watch` attachments for a component shadow root.
 * Returns null when the shadow was never bound (or already aborted and cleared).
 */
export function getAttachmentStats(shadowRoot) {
  const stats = attachmentStats.get(shadowRoot);
  if (!stats) return null;
  return {
    onRootListeners: stats.onRootListeners,
    onRegistrations: stats.onRegistrations,
    watchBuckets: stats.watchBuckets,
    watchRegistrations: stats.watchRegistrations,
    slotListeners: stats.slotListeners
  };
}

function ensureStats(shadowRoot) {
  let stats = attachmentStats.get(shadowRoot);
  if (!stats) {
    stats = {
      onRootListeners: 0,
      onRegistrations: 0,
      watchBuckets: 0,
      watchRegistrations: 0,
      slotListeners: 0
    };
    attachmentStats.set(shadowRoot, stats);
  }
  return stats;
}
function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function isAbortSignal(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof value.aborted === 'boolean' &&
    typeof value.addEventListener === 'function'
  );
}

function normalizeSignalOptions(value, defaultSignal) {
  if (isAbortSignal(value)) {
    return { signal: value };
  }

  if (value && typeof value === 'object') {
    return {
      ...value,
      signal: value.signal || defaultSignal
    };
  }

  return { signal: defaultSignal };
}

function escapeAttrValue(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function warn(message) {
  if (typeof console !== 'undefined') {
    console.warn(message);
  }
}

function isElement(value) {
  return value?.nodeType === Node.ELEMENT_NODE;
}

function resolveTargets(shadowRoot, target) {
  if (typeof target === 'string') {
    try {
      return {
        selector: target,
        targets: Array.from(shadowRoot.querySelectorAll(target))
      };
    } catch (err) {
      warn(`[Native UI] Invalid watch selector "${target}": ${err.message}`);
      return null;
    }
  }

  if (isElement(target)) {
    if (!shadowRoot.contains(target)) {
      throw new Error('[Native UI] WatchError: direct watch target is outside this component shadow root.');
    }
    return {
      selector: null,
      targets: [target]
    };
  }

  warn('[Native UI] Watch target must be a selector string or Element reference.');
  return null;
}

function isInside(target, root) {
  return target === root || root.contains(target);
}

function matchesTarget(recordTarget, reg) {
  if (!isElement(recordTarget)) return false;

  if (reg.selector) {
    try {
      return recordTarget.matches(reg.selector) && reg.shadowRoot.contains(recordTarget);
    } catch {
      return false;
    }
  }

  return reg.targets.some(target => recordTarget === target);
}

function matchesTargetOrSubtree(recordTarget, reg) {
  if (!isElement(recordTarget)) return false;

  if (reg.selector) {
    try {
      const match = recordTarget.matches(reg.selector)
        ? recordTarget
        : recordTarget.closest(reg.selector);
      return Boolean(match && reg.shadowRoot.contains(match));
    } catch {
      return false;
    }
  }

  return reg.targets.some(target => isInside(recordTarget, target));
}

/**
 * TagsCache provides a fast, cached query interface for Shadow DOM elements.
 * Pre-warmed at mount using the Rust-generated JSON descriptor.
 */
export class TagsCache {
  constructor(shadowRoot) {
    this.root = shadowRoot;
    this.oneCache = new Map();
    this.allCache = new Map();
  }

  one(selector) {
    if (!this.oneCache.has(selector)) {
      this.oneCache.set(selector, this.root.querySelector(selector));
    }
    return this.oneCache.get(selector);
  }

  all(selector) {
    if (!this.allCache.has(selector)) {
      this.allCache.set(selector, Array.from(this.root.querySelectorAll(selector)));
    }
    return this.allCache.get(selector);
  }

  each(selector, fn) {
    const items = this.all(selector);
    for (let i = 0; i < items.length; i++) {
      fn(items[i], i);
    }
  }

  has(selector) {
    return this.one(selector) !== null;
  }

  clear() {
    this.oneCache.clear();
    this.allCache.clear();
  }

  prewarmId(id) {
    const el = typeof this.root.getElementById === 'function'
      ? this.root.getElementById(id)
      : this.root.querySelector(`#${escapeAttrValue(id)}`);
    if (el) {
      this.oneCache.set(`#${id}`, el);
    }
  }

  prewarm(selector, element) {
    if (element) {
      this.oneCache.set(selector, element);
    }
  }
}

export function createRefs(shadowRoot, descriptor) {
  const refs = Object.create(null);
  const names = Array.isArray(descriptor?.refs) ? descriptor.refs : null;
  const nameSet = names ? new Set(names) : null;

  const all = shadowRoot.querySelectorAll('[ref]');
  for (const node of all) {
    const name = node.getAttribute('ref');
    if (!name) continue;
    if (nameSet && !nameSet.has(name)) continue;

    if (refs[name]) {
      warn(`[Native UI] Duplicate ref "${name}" found. Using the first match.`);
    } else {
      refs[name] = node;
    }
  }

  return Object.freeze(refs);
}

export function prewarmTags(tags, refs, descriptor) {
  for (const id of descriptor?.ids || []) {
    tags.prewarmId(id);
  }

  for (const [name, element] of Object.entries(refs)) {
    tags.prewarm(`[ref="${escapeAttrValue(name)}"]`, element);
  }
}

/**
 * Warm TagsCache from a live (adopted) shadow tree when no compile-time
 * descriptor is available — walks `[id]` nodes already in the DSD markup.
 */
export function rehydrateTagsFromDom(tags, shadowRoot) {
  if (!shadowRoot?.querySelectorAll) return;
  for (const el of shadowRoot.querySelectorAll('[id]')) {
    if (el.id) tags.prewarmId(el.id);
  }
}

export function installInvalidationHooks(shadowRoot, tags) {
  // Use a simple, native MutationObserver to clear tags cache when children change (R-07)
  const observer = new MutationObserver(() => {
    tags.clear();
  });
  observer.observe(shadowRoot, { childList: true, subtree: false });
  return () => observer.disconnect();
}

/**
 * Creates the `on` delegated event proxy.
 * Example: on.click('.btn', (e, target) => { ... })
 *
 * Matching walks composedPath() within the shadow root (aligned with events.delegate).
 * Passive defaults match events.listen (touch/wheel only).
 * Empty registries remove the root listener immediately (G2).
 */
export function createEventDelegator(shadowRoot, defaultSignal) {
  const registries = new Map();
  const listeners = new Map();
  const dedupeKeys = new Map();
  let nextId = 0;
  const stats = ensureStats(shadowRoot);

  function syncOnStats() {
    let regs = 0;
    for (const registry of registries.values()) regs += registry.size;
    stats.onRootListeners = listeners.size;
    stats.onRegistrations = regs;
  }

  function listenerKey(eventType, capture) {
    return `${String(eventType)}\0${capture ? 'capture' : 'bubble'}`;
  }

  function parseListenerKey(key) {
    const idx = key.lastIndexOf('\0');
    return {
      eventType: key.slice(0, idx),
      capture: key.slice(idx + 1) === 'capture'
    };
  }

  function isPassiveRequired(key) {
    const registry = registries.get(key);
    if (!registry || registry.size === 0) {
      return true;
    }
    for (const reg of registry.values()) {
      if (reg.passive === false) return false;
    }
    return true;
  }

  function tearDownListener(key) {
    const active = listeners.get(key);
    if (!active) return;
    shadowRoot.removeEventListener(active.eventType, active.handler, {
      capture: active.capture
    });
    listeners.delete(key);
  }

  function ensureListener(eventType, capture) {
    const key = listenerKey(eventType, capture);
    const registry = registries.get(key);

    // G2: remove shadow-root listener when no handlers remain for this key.
    if (!registry?.size) {
      tearDownListener(key);
      registries.delete(key);
      dedupeKeys.delete(key);
      syncOnStats();
      return;
    }

    const currentPassive = isPassiveRequired(key);
    const active = listeners.get(key);
    if (active) {
      if (active.passive === currentPassive) {
        syncOnStats();
        return;
      }
      tearDownListener(key);
    }

    const rootListener = (event) => {
      if (defaultSignal?.aborted) return;
      const activeRegistry = registries.get(key);
      if (!activeRegistry?.size) return;

      for (const reg of Array.from(activeRegistry.values())) {
        if (reg.signal?.aborted) {
          remove(key, reg.id);
          continue;
        }

        const match = resolveMatch(event, reg);
        if (!match) continue;
        if (!matchesAttrs(match, reg.attrs)) continue;
        if (isExcludedByNot(match, reg.not, shadowRoot)) continue;

        reg.handler(event, match);
        if (reg.once) remove(key, reg.id);
      }
    };

    shadowRoot.addEventListener(eventType, rootListener, {
      signal: defaultSignal,
      capture,
      passive: currentPassive
    });
    listeners.set(key, {
      handler: rootListener,
      passive: currentPassive,
      eventType,
      capture
    });
    syncOnStats();
  }

  function remove(key, id) {
    const registry = registries.get(key);
    if (!registry) return;
    const reg = registry.get(id);
    if (!reg) return;
    registry.delete(id);
    if (reg.key != null) {
      const keyMap = dedupeKeys.get(key);
      if (keyMap?.get(reg.key) === id) keyMap.delete(reg.key);
    }
    const { eventType, capture } = parseListenerKey(key);
    ensureListener(eventType, capture);
  }

  function resolveMatch(event, reg) {
    if (reg.element) {
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      for (const node of path) {
        if (node === shadowRoot) break;
        if (node === reg.element) return reg.element;
      }
      return null;
    }
    return matchInComposedPath(event, reg.selector, shadowRoot, reg.scope);
  }

  function add(eventType, selectorOrTarget, handler, signalOrOptions, once = false) {
    let selector = null;
    let element = null;

    if (typeof selectorOrTarget === 'string') {
      selector = selectorOrTarget;
    } else if (isElement(selectorOrTarget)) {
      if (!shadowRoot.contains(selectorOrTarget)) {
        warn(`[Native UI] on.${String(eventType)} direct target is outside this component shadow root.`);
        return () => {};
      }
      element = selectorOrTarget;
    } else {
      warn(`[Native UI] on.${String(eventType)} requires a selector or Element and handler.`);
      return () => {};
    }

    if (typeof handler !== 'function') {
      warn(`[Native UI] on.${String(eventType)} requires a handler.`);
      return () => {};
    }

    const options = normalizeSignalOptions(signalOrOptions, defaultSignal);
    const capture = Boolean(options.capture);
    const key = listenerKey(eventType, capture);
    const signal = options.signal;

    if (signal?.aborted) return () => {};

    // Align with events.listen: passive only for scroll-critical types unless overridden.
    const passive = resolvePassiveDefault(eventType, options.passive);

    if (options.key != null) {
      if (!dedupeKeys.has(key)) dedupeKeys.set(key, new Map());
      const keyMap = dedupeKeys.get(key);
      const prevId = keyMap.get(options.key);
      if (prevId != null) {
        // Full remove so empty-registry teardown / stats stay precise.
        remove(key, prevId);
      }
    }

    const id = ++nextId;
    if (!registries.has(key)) registries.set(key, new Map());

    registries.get(key).set(id, {
      id,
      selector,
      element,
      handler,
      signal,
      once: once || Boolean(options.once),
      passive,
      attrs: options.attrs || null,
      not: typeof options.not === 'string' ? options.not : null,
      key: options.key != null ? options.key : null,
      scope: options.scope === 'assigned' ? 'assigned' : 'shadow'
    });

    if (options.key != null) {
      dedupeKeys.get(key).set(options.key, id);
    }

    ensureListener(eventType, capture);

    const abortDispose = () => {
      remove(key, id);
    };
    signal?.addEventListener('abort', abortDispose, { once: true });

    const dispose = () => {
      remove(key, id);
      signal?.removeEventListener('abort', abortDispose);
    };
    return dispose;
  }

  defaultSignal?.addEventListener('abort', () => {
    for (const active of listeners.values()) {
      shadowRoot.removeEventListener(active.eventType, active.handler, {
        capture: active.capture
      });
    }
    registries.clear();
    listeners.clear();
    dedupeKeys.clear();
    syncOnStats();
  }, { once: true });

  syncOnStats();

  return new Proxy({}, {
    get(_target, eventType) {
      if (typeof eventType === 'symbol') return undefined;

      const bind = (selector, handler, signalOrOptions) => (
        add(eventType, selector, handler, signalOrOptions, false)
      );
      bind.once = (selector, handler, signalOrOptions) => (
        add(eventType, selector, handler, signalOrOptions, true)
      );
      return bind;
    }
  });
}

function serializeWatchOptions(opts) {
  return JSON.stringify({
    attributes: Boolean(opts.attributes),
    attributeFilter: opts.attributeFilter ? [...opts.attributeFilter].sort() : null,
    attributeOldValue: Boolean(opts.attributeOldValue),
    childList: Boolean(opts.childList),
    subtree: Boolean(opts.subtree),
    characterData: Boolean(opts.characterData),
    characterDataOldValue: Boolean(opts.characterDataOldValue)
  });
}

function observeOptionsForReg(reg) {
  if (reg.kind === 'attr') {
    const options = {
      attributes: true,
      attributeOldValue: true,
      childList: false,
      characterData: false,
      subtree: Boolean(reg.selector)
    };
    if (reg.attrs !== '*') {
      options.attributeFilter = Array.from(reg.attrs);
    }
    return options;
  }

  if (reg.kind === 'kids') {
    return {
      attributes: false,
      childList: true,
      characterData: false,
      subtree: Boolean(reg.selector) || Boolean(reg.deep)
    };
  }

  if (reg.kind === 'text') {
    return {
      attributes: false,
      childList: false,
      characterData: true,
      characterDataOldValue: true,
      subtree: true
    };
  }

  // tree — wide escape hatch; isolated in its own bucket
  return {
    attributes: true,
    attributeOldValue: true,
    childList: true,
    characterData: true,
    characterDataOldValue: true,
    subtree: true
  };
}

/**
 * Mutation watcher with observer buckets keyed by observe fingerprint (G1).
 * A tree / attr * registration never widens a neighbor's attributeFilter or subtree.
 */
export function createMutationWatcher(shadowRoot, defaultSignal) {
  const registry = new Map();
  const buckets = new Map();
  let nextId = 0;
  let nextBucketId = 0;
  let slotListenerCount = 0;
  const stats = ensureStats(shadowRoot);

  function syncWatchStats() {
    stats.watchBuckets = buckets.size;
    stats.watchRegistrations = registry.size;
    stats.slotListeners = slotListenerCount;
  }

  function add(kind, args, once = false) {
    if (defaultSignal?.aborted || typeof MutationObserver === 'undefined') {
      return () => {};
    }

    if (kind === 'slot') {
      return addSlotWatch(args, once);
    }

    const reg = normalizeWatchRegistration(kind, args, once);
    if (!reg) return () => {};

    registry.set(reg.id, reg);

    const abortDispose = () => remove(reg.id);
    reg.signal?.addEventListener('abort', abortDispose, { once: true });
    joinBucket(reg);
    syncWatchStats();

    const dispose = () => {
      remove(reg.id);
      reg.signal?.removeEventListener('abort', abortDispose);
    };
    return dispose;
  }

  function addSlotWatch(args, once) {
    const target = args[0];
    const handler = args[1];
    const signalOrOptions = args[2];

    if (typeof handler !== 'function') {
      warn('[Native UI] watch.slot requires a handler function.');
      return () => {};
    }

    const options = normalizeSignalOptions(signalOrOptions, defaultSignal);
    if (options.signal?.aborted) return () => {};

    const resolved = resolveTargets(shadowRoot, target);
    if (!resolved) return () => {};

    const slots = resolved.targets.filter((el) => el instanceof HTMLSlotElement);
    if (!slots.length) {
      warn('[Native UI] watch.slot target must resolve to <slot> element(s).');
      return () => {};
    }

    const disposers = [];
    let fired = false;
    let active = true;

    for (const slot of slots) {
      const listener = () => {
        if (!active || options.signal?.aborted || defaultSignal?.aborted) return;
        if (once && fired) return;
        fired = true;
        handler({
          assigned: slot.assignedNodes({ flatten: false }),
          assignedElements: slot.assignedElements({ flatten: false })
        }, slot);
        if (once) {
          cleanup();
        }
      };
      slot.addEventListener('slotchange', listener, { signal: options.signal });
      disposers.push(() => {
        slot.removeEventListener('slotchange', listener);
      });
      slotListenerCount++;
    }
    syncWatchStats();

    const cleanup = () => {
      if (!active) return;
      active = false;
      for (const d of disposers) d();
      slotListenerCount = Math.max(0, slotListenerCount - disposers.length);
      syncWatchStats();
    };

    options.signal?.addEventListener('abort', cleanup, { once: true });

    return () => {
      cleanup();
      options.signal?.removeEventListener('abort', cleanup);
    };
  }

  function normalizeWatchRegistration(kind, args, once) {
    const target = args[0];
    const resolved = resolveTargets(shadowRoot, target);
    if (!resolved) return null;

    let attrs = null;
    let deep = false;
    let handler = null;
    let signalOrOptions = null;

    if (kind === 'attr') {
      attrs = args[1] === '*' ? '*' : new Set(asArray(args[1]).filter(Boolean));
      handler = args[2];
      signalOrOptions = args[3];
      if (attrs !== '*' && attrs.size === 0) {
        warn('[Native UI] watch.attr requires at least one attribute name or "*".');
        return null;
      }
    } else if (kind === 'kids') {
      if (typeof args[1] === 'function') {
        handler = args[1];
        signalOrOptions = args[2];
      } else {
        deep = Boolean(args[1]?.deep);
        handler = args[2];
        signalOrOptions = args[3];
      }
    } else {
      handler = args[1];
      signalOrOptions = args[2];
    }

    if (typeof handler !== 'function') {
      warn(`[Native UI] watch.${kind} requires a handler function.`);
      return null;
    }

    const options = normalizeSignalOptions(signalOrOptions, defaultSignal);
    if (options.signal?.aborted) return null;

    if (
      resolved.selector &&
      !resolved.targets.length &&
      options.requirePresent
    ) {
      warn(`[Native UI] watch.${kind} target "${resolved.selector}" matched nothing (requirePresent).`);
      return null;
    }

    if (!resolved.targets.length && typeof target === 'string' && !options.requirePresent) {
      warn(`[Native UI] watch.${kind} target "${target}" did not match any elements currently.`);
    }

    return {
      id: ++nextId,
      kind,
      shadowRoot,
      selector: resolved.selector,
      targets: resolved.targets,
      attrs,
      deep,
      handler,
      once: once || Boolean(options.once),
      signal: options.signal,
      bucketKey: null
    };
  }

  function bucketKeyFor(reg, opts) {
    const mode = reg.selector ? 'shadow' : 'direct';
    return `${mode}:${serializeWatchOptions(opts)}`;
  }

  function joinBucket(reg) {
    const opts = observeOptionsForReg(reg);
    const key = bucketKeyFor(reg, opts);
    reg.bucketKey = key;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        id: ++nextBucketId,
        key,
        mode: reg.selector ? 'shadow' : 'direct',
        options: opts,
        regs: new Set(),
        targets: new Set(),
        observer: null
      };
      buckets.set(key, bucket);
    }

    bucket.regs.add(reg.id);
    if (bucket.mode === 'direct') {
      for (const target of reg.targets) bucket.targets.add(target);
    }
    refreshBucket(bucket);
  }

  function leaveBucket(reg) {
    const key = reg.bucketKey;
    if (!key) return;
    const bucket = buckets.get(key);
    if (!bucket) return;

    bucket.regs.delete(reg.id);
    if (!bucket.regs.size) {
      bucket.observer?.disconnect();
      buckets.delete(key);
      syncWatchStats();
      return;
    }

    if (bucket.mode === 'direct') {
      bucket.targets.clear();
      for (const id of bucket.regs) {
        const other = registry.get(id);
        if (!other) continue;
        for (const target of other.targets) bucket.targets.add(target);
      }
      refreshBucket(bucket);
    }
    syncWatchStats();
  }

  function refreshBucket(bucket) {
    bucket.observer?.disconnect();
    if (!bucket.regs.size || defaultSignal?.aborted) return;

    bucket.observer ||= new MutationObserver((records) => {
      dispatchBucket(bucket, records);
    });

    if (bucket.mode === 'shadow') {
      bucket.observer.observe(shadowRoot, bucket.options);
      return;
    }

    for (const target of bucket.targets) {
      bucket.observer.observe(target, bucket.options);
    }
  }

  function remove(id) {
    const reg = registry.get(id);
    if (!reg) return;
    registry.delete(id);
    leaveBucket(reg);
    syncWatchStats();
  }

  function dispatchBucket(bucket, records) {
    if (defaultSignal?.aborted) return;

    for (const id of Array.from(bucket.regs)) {
      const reg = registry.get(id);
      if (!reg) continue;
      if (reg.signal?.aborted) {
        remove(reg.id);
        continue;
      }

      const matches = filterWatchRecords(records, reg);
      if (!matches.length) continue;

      callWatchHandler(matches, reg);
      if (reg.once) remove(reg.id);
    }
  }

  defaultSignal?.addEventListener('abort', () => {
    for (const bucket of buckets.values()) {
      bucket.observer?.disconnect();
    }
    buckets.clear();
    registry.clear();
    slotListenerCount = 0;
    syncWatchStats();
  }, { once: true });

  syncWatchStats();

  return createWatchProxy(add);
}

function createWatchProxy(add) {
  const methods = Object.create(null);
  for (const kind of ['attr', 'kids', 'text', 'tree', 'slot']) {
    const method = (...args) => add(kind, args, false);
    method.once = (...args) => add(kind, args, true);
    methods[kind] = method;
  }
  // Docs historically used watch.children — alias to kids (G9).
  methods.children = methods.kids;
  return Object.freeze(methods);
}

function filterWatchRecords(records, reg) {
  if (reg.kind === 'tree') {
    return records.filter(record => {
      const target = record.target.nodeType === Node.TEXT_NODE
        ? record.target.parentElement
        : record.target;
      return matchesTargetOrSubtree(target, reg);
    });
  }

  if (reg.kind === 'attr') {
    return records.filter(record => (
      record.type === 'attributes' &&
      matchesTarget(record.target, reg) &&
      (reg.attrs === '*' || reg.attrs.has(record.attributeName))
    ));
  }

  if (reg.kind === 'kids') {
    return records.filter(record => (
      record.type === 'childList' &&
      (reg.deep ? matchesTargetOrSubtree(record.target, reg) : matchesTarget(record.target, reg))
    ));
  }

  if (reg.kind === 'text') {
    return records.filter(record => {
      if (record.type !== 'characterData') return false;
      return matchesTargetOrSubtree(record.target.parentElement, reg);
    });
  }

  return [];
}

function callWatchHandler(records, reg) {
  if (reg.kind === 'tree') {
    const target = reg.targets[0] || null;
    reg.handler(records, target);
    return;
  }

  for (const record of records) {
    if (reg.kind === 'attr') {
      reg.handler(
        record.attributeName,
        record.target.getAttribute(record.attributeName),
        record.oldValue,
        record.target
      );
    } else if (reg.kind === 'kids') {
      reg.handler({
        added: Array.from(record.addedNodes),
        removed: Array.from(record.removedNodes)
      }, record.target);
    } else if (reg.kind === 'text') {
      const element = record.target.parentElement;
      reg.handler(element?.textContent ?? '', record.oldValue, element);
    }
  }
}

export function createComponentContext({ el, shadowRoot, ctrl, descriptor, internals, adopted = false }) {
  const tags = new TagsCache(shadowRoot);
  // createRefs walks existing `[ref]` nodes — works for CSR clones and adopted DSD alike.
  const refs = createRefs(shadowRoot, descriptor);
  // on / watch bind to the live shadowRoot; AbortSignal cleanup still via ctrl.signal.
  const on = createEventDelegator(shadowRoot, ctrl?.signal);
  const watch = createMutationWatcher(shadowRoot, ctrl?.signal);
  const disposeInvalidationHooks = installInvalidationHooks(shadowRoot, tags);

  prewarmTags(tags, refs, descriptor);
  if (adopted) {
    rehydrateTagsFromDom(tags, shadowRoot);
  }
  ctrl?.signal?.addEventListener('abort', disposeInvalidationHooks, { once: true });

  return Object.freeze({
    el,
    ctrl,
    tags,
    on,
    refs,
    watch,
    internals,
    /** True when this mount adopted a pre-existing open shadow (DSD / SSR). */
    adopted: Boolean(adopted)
  });
}
