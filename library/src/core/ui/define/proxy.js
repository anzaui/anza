const rootHooks = new WeakMap();

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

function getEventElement(event) {
  if (event.target?.nodeType === Node.ELEMENT_NODE) {
    return event.target;
  }

  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  for (const node of path) {
    if (node?.nodeType === Node.ELEMENT_NODE) {
      return node;
    }
  }

  return null;
}

function safeClosest(start, selector) {
  try {
    return start?.closest?.(selector) || null;
  } catch (err) {
    warn(`[Native UI] Invalid delegated event selector "${selector}": ${err.message}`);
    return null;
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
 */
export function createEventDelegator(shadowRoot, defaultSignal) {
  const registries = new Map();
  const listeners = new Map();
  let nextId = 0;

  function listenerKey(eventType, capture) {
    return `${String(eventType)}:${capture ? 'capture' : 'bubble'}`;
  }

  function isPassiveRequired(key) {
    const registry = registries.get(key);
    if (!registry || registry.size === 0) return true;
    for (const reg of registry.values()) {
      if (reg.passive === false) return false;
    }
    return true;
  }

  function ensureListener(eventType, capture) {
    const key = listenerKey(eventType, capture);
    const currentPassive = isPassiveRequired(key);
    
    // Check if we already have a registered listener with the exact same passive configuration (R-02)
    const active = listeners.get(key);
    if (active) {
      if (active.passive === currentPassive) return;
      shadowRoot.removeEventListener(eventType, active.handler, { capture });
      listeners.delete(key);
    }

    const rootListener = (event) => {
      if (defaultSignal?.aborted) return;
      const registry = registries.get(key);
      if (!registry?.size) return;

      const start = getEventElement(event);
      if (!start) return;

      for (const reg of Array.from(registry.values())) {
        if (reg.signal?.aborted) {
          remove(key, reg.id);
          continue;
        }

        const match = safeClosest(start, reg.selector);
        if (!match || !shadowRoot.contains(match)) continue;

        reg.handler(event, match);
        if (reg.once) remove(key, reg.id);
      }
    };

    shadowRoot.addEventListener(eventType, rootListener, {
      signal: defaultSignal,
      capture,
      passive: currentPassive
    });
    listeners.set(key, { handler: rootListener, passive: currentPassive });
  }

  function remove(key, id) {
    registries.get(key)?.delete(id);
  }

  function add(eventType, selector, handler, signalOrOptions, once = false) {
    if (typeof selector !== 'string' || typeof handler !== 'function') {
      warn(`[Native UI] on.${String(eventType)} requires a selector and handler.`);
      return () => {};
    }

    const options = normalizeSignalOptions(signalOrOptions, defaultSignal);
    const capture = Boolean(options.capture);
    const key = listenerKey(eventType, capture);
    const id = ++nextId;
    const signal = options.signal;

    if (signal?.aborted) return () => {};

    // Default to true (passive: true) unless options.passive is explicitly false (R-02)
    const passive = options.passive !== false;

    if (!registries.has(key)) registries.set(key, new Map());

    registries.get(key).set(id, {
      id,
      selector,
      handler,
      signal,
      once: once || Boolean(options.once),
      passive
    });

    ensureListener(eventType, capture);

    const abortDispose = () => {
      remove(key, id);
      ensureListener(eventType, capture);
    };
    signal?.addEventListener('abort', abortDispose, { once: true });

    const dispose = () => {
      remove(key, id);
      ensureListener(eventType, capture);
      signal?.removeEventListener('abort', abortDispose);
    };
    return dispose;
  }

  defaultSignal?.addEventListener('abort', () => {
    registries.clear();
    listeners.clear();
  }, { once: true });

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

export function createMutationWatcher(shadowRoot, defaultSignal) {
  const registry = new Map();
  let observer = null;
  let nextId = 0;

  function add(kind, args, once = false) {
    if (defaultSignal?.aborted || typeof MutationObserver === 'undefined') {
      return () => {};
    }

    const reg = normalizeWatchRegistration(kind, args, once);
    if (!reg) return () => {};

    registry.set(reg.id, reg);

    const abortDispose = () => remove(reg.id);
    reg.signal?.addEventListener('abort', abortDispose, { once: true });
    refreshObserver();

    const dispose = () => {
      remove(reg.id);
      reg.signal?.removeEventListener('abort', abortDispose);
    };
    return dispose;
  }

  function normalizeWatchRegistration(kind, args, once) {
    const target = args[0];
    const resolved = resolveTargets(shadowRoot, target);
    if (!resolved) return null;

    if (!resolved.targets.length && typeof target === 'string') {
      warn(`[Native UI] watch.${kind} target "${target}" did not match any elements currently.`);
    }

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
      signal: options.signal
    };
  }

  function remove(id) {
    if (!registry.delete(id)) return;
    refreshObserver();
  }

  function refreshObserver() {
    observer?.disconnect();
    if (!registry.size || defaultSignal?.aborted) return;

    observer ||= new MutationObserver(dispatch);
    
    // R-04: Only watch shadow root subtree if selector targets are specified.
    // If target is direct element references, we observe them directly with subtree: false
    let needsSubtree = false;
    for (const reg of registry.values()) {
      if (reg.selector) {
        needsSubtree = true;
        break;
      }
    }

    const options = computeWatchOptions(needsSubtree);

    if (needsSubtree) {
      observer.observe(shadowRoot, options);
    } else {
      const seen = new Set();
      for (const reg of registry.values()) {
        for (const target of reg.targets) {
          if (!seen.has(target)) {
            seen.add(target);
            observer.observe(target, options);
          }
        }
      }
    }
  }

  function computeWatchOptions(needsSubtree) {
    let hasAttr = false;
    let hasAllAttrs = false;
    let hasKids = false;
    let hasText = false;
    let hasTree = false;
    let hasDeepKids = false;
    const attrs = new Set();

    for (const reg of registry.values()) {
      if (reg.kind === 'tree') hasTree = true;
      if (reg.kind === 'kids') {
        hasKids = true;
        if (reg.deep) hasDeepKids = true;
      }
      if (reg.kind === 'text') hasText = true;
      if (reg.kind === 'attr') {
        hasAttr = true;
        if (reg.attrs === '*') {
          hasAllAttrs = true;
        } else {
          for (const attr of reg.attrs) attrs.add(attr);
        }
      }
    }

    const shouldObserveAttrs = hasAttr || hasTree;
    const options = {
      attributes: shouldObserveAttrs,
      attributeOldValue: shouldObserveAttrs,
      childList: hasKids || hasTree,
      characterData: hasText || hasTree,
      characterDataOldValue: hasText || hasTree,
      subtree: needsSubtree || hasTree || hasDeepKids || hasText
    };

    if (shouldObserveAttrs && !hasTree && !hasAllAttrs && attrs.size > 0) {
      options.attributeFilter = Array.from(attrs);
    }

    return options;
  }

  function dispatch(records) {
    if (defaultSignal?.aborted) return;

    for (const reg of Array.from(registry.values())) {
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
    observer?.disconnect();
    registry.clear();
  }, { once: true });

  return createWatchProxy(add);
}

function createWatchProxy(add) {
  const methods = Object.create(null);
  for (const kind of ['attr', 'kids', 'text', 'tree']) {
    const method = (...args) => add(kind, args, false);
    method.once = (...args) => add(kind, args, true);
    methods[kind] = method;
  }
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

export function createComponentContext({ el, shadowRoot, ctrl, descriptor, internals }) {
  const tags = new TagsCache(shadowRoot);
  const refs = createRefs(shadowRoot, descriptor);
  const on = createEventDelegator(shadowRoot, ctrl?.signal);
  const watch = createMutationWatcher(shadowRoot, ctrl?.signal);
  const disposeInvalidationHooks = installInvalidationHooks(shadowRoot, tags);

  prewarmTags(tags, refs, descriptor);
  ctrl?.signal?.addEventListener('abort', disposeInvalidationHooks, { once: true });

  return Object.freeze({
    el,
    ctrl,
    tags,
    on,
    refs,
    watch,
    internals
  });
}
