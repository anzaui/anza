# Scoped Mutation Observation API: `watch`

`watch` is the component-scoped mutation observation helper injected alongside `tags`, `refs`, and `on`. It wraps `MutationObserver` with lifecycle cleanup, shadow-root scoping, selector/direct-ref targeting, one-shot handlers, and mutation-specific handler signatures.

## 1. Injection Shape

```javascript
mount({ el, ctrl, tags, on, refs, watch }) {}

update({ el, ctrl, tags, on, refs, watch, name, val, prev }) {}
```

`watch` is created once per connected lifecycle. If the component disconnects, `ctrl.abort()` disconnects the shared observer and removes every registration.

## 2. API Summary

```javascript
watch.attr(target, attrName, handler, signalOrOptions?)
watch.attr(target, attrNames, handler, signalOrOptions?)
watch.attr(target, '*', handler, signalOrOptions?)

watch.kids(target, handler, signalOrOptions?)
watch.kids(target, { deep: true }, handler, signalOrOptions?)
watch.children(...) // alias of watch.kids

watch.text(target, handler, signalOrOptions?)

watch.tree(target, handler, signalOrOptions?)

watch.slot(slotOrSelector, handler, signalOrOptions?)

watch.attr.once(...)
watch.kids.once(...)
watch.text.once(...)
watch.tree.once(...)
watch.slot.once(...)
```

Observers are bucketed by option fingerprint so a `tree` / `attr *` registration never widens another watch’s `attributeFilter` or `subtree`.

`target` can be:

- A selector string scoped to the component shadow root.
- A direct `Element` reference from `refs.*` or `tags.one(...)`.

The final argument can be:

- An `AbortSignal`.
- An options object: `{ signal, once }`.
- Omitted, in which case `ctrl.signal` is used.

Every call returns a disposer function.

```javascript
const stop = watch.attr(refs.submit, 'disabled', handler);
stop();
```

## 3. Attribute Watching: `watch.attr`

Observe one, many, or all attributes.

```javascript
watch.attr('button', 'disabled', (attr, next, prev, el) => {})
watch.attr('.card', ['aria-expanded', 'data-state'], handler)
watch.attr('.card', '*', handler)
watch.attr(refs.submit, 'disabled', handler)
watch.attr(tags.one('#toggle'), 'aria-pressed', handler)
watch.attr.once('details', 'open', handler)
```

Handler:

```javascript
(attrName, newValue, oldValue, element) => void
```

Example:

```javascript
mount({ refs, watch }) {
  watch.attr(refs.submit, 'disabled', (attr, next, prev, button) => {
    button.dataset.wasDisabled = String(prev !== null);
  });
}
```

Notes:

- `newValue` is read with `element.getAttribute(attrName)`, so removed attributes produce `null`.
- `oldValue` comes from the mutation record and is always requested internally.
- Boolean attributes usually have `''` when present and `null` when absent.

## 4. Child Watching: `watch.kids`

Observe child additions and removals.

```javascript
watch.kids('ul', ({ added, removed }, list) => {})
watch.kids(refs.list, handler)
watch.kids('ul', { deep: true }, handler)
watch.kids.once('ul', handler)
```

Handler:

```javascript
({ added, removed }, element) => void
```

Example:

```javascript
mount({ refs, watch }) {
  watch.kids(refs.list, ({ added }) => {
    for (const node of added) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        node.classList.add('entry-new');
      }
    }
  });
}
```

Rules:

- `added` and `removed` are arrays, never `NodeList`.
- Without `{ deep: true }`, only direct child mutations on the target match.
- With `{ deep: true }`, descendant child mutations inside the target subtree match.

## 5. Text Watching: `watch.text`

Observe text-node changes inside a target.

```javascript
watch.text('.label', (next, prev, el) => {})
watch.text(refs.counter, handler)
watch.text.once('.status', handler)
```

Handler:

```javascript
(newText, oldText, element) => void
```

Example:

```javascript
mount({ refs, watch }) {
  watch.text(refs.counter, (next, prev, el) => {
    const direction = Number(next) > Number(prev) ? 'up' : 'down';
    el.dataset.direction = direction;
  });
}
```

Notes:

- `newText` is the current `textContent` of the watched element.
- `oldText` is the previous text node value from the mutation record.
- Multiple text nodes may produce multiple records in the same microtask batch.

## 6. Subtree Watching: `watch.tree`

Observe all mutation types under a target and receive raw records.

```javascript
watch.tree('.editor', (records) => {})
watch.tree(refs.canvas, handler)
watch.tree.once('.editor', handler)
```

Handler:

```javascript
(records, element) => void
```

Example:

```javascript
mount({ refs, watch }) {
  watch.tree(refs.editor, (records) => {
    for (const record of records) {
      if (record.type === 'childList') syncOutline();
      if (record.type === 'attributes') syncToolbar();
    }
  });
}
```

`watch.tree` is the escape hatch. Prefer `attr`, `kids`, or `text` when the mutation type is known.

## 7. Scoping Rules

`watch` never observes outside the component shadow root.

- Selector targets are resolved with `shadowRoot.querySelectorAll`.
- Direct element targets must satisfy `shadowRoot.contains(element)`.
- A selector with no matches returns a no-op disposer and warns in development.
- A direct target outside the shadow root throws in development and returns a no-op disposer in production.
- Cross-component observation must use `CustomEvent`, shared state, or parent-owned refs.

## 8. Observer buckets

Each component instance owns **MutationObserver buckets** keyed by observe fingerprint (root mode + options). Registrations join the bucket whose options they need. A `tree` / `attr *` registration creates (or joins) a *wide* bucket — it must **not** widen a narrow bucket used by other regs.

```javascript
fingerprint = {
  mode,                // 'shadow' (selector late-bind) | 'direct'
  attributes, attributeFilter|*, attributeOldValue,
  childList, subtree,
  characterData, characterDataOldValue
}
```

- Direct Element targets with identical narrow options share one MO observing those targets.
- Selector targets that need late-bind observe the shadow root only in a bucket that requires it.
- On last registration leave → `disconnect` that bucket’s observer.
- `watch.slot` uses `slotchange` listeners (counted separately in `getAttachmentStats`), not MO buckets.

## 9. Matching Rules

Attribute records:

- Match `record.type === 'attributes'`.
- Match when `record.target === registration.target`.
- For selector targets with multiple elements, match any registered target element.
- Attribute name must be included in `attrs`, unless `attrs === '*'`.

Child records:

- Match `record.type === 'childList'`.
- Without `deep`, match only `record.target === registration.target`.
- With `deep`, match `registration.target.contains(record.target)`.

Text records:

- Match `record.type === 'characterData'`.
- Use `record.target.parentElement` as the element.
- Match if the parent is the registration target or is contained by it.

Tree records:

- Match any record where the mutation target is the watched element or inside it.
- Handler receives the filtered record batch.

## 10. Cleanup

Cleanup must be deterministic:

- Default signal is the component `ctrl.signal`.
- A custom signal removes only that registration.
- `.once` removes only that registration after the first matching mutation.
- Component abort disconnects the shared observer and clears the registry.
- The mutation callback checks `defaultSignal.aborted` before dispatching because queued observer callbacks can still run after `disconnect()`.

## 11. Implementation Pseudocode

```javascript
export function createMutationWatcher(shadowRoot, defaultSignal) {
  const registry = new Map();
  let observer = null;
  let nextId = 0;

  function add(kind, args, once = false) {
    const reg = normalizeRegistration(kind, args, once, defaultSignal, shadowRoot);
    if (!reg) return () => {};

    registry.set(reg.id, reg);
    reg.signal?.addEventListener('abort', () => remove(reg.id), { once: true });
    refreshObserver();

    return () => remove(reg.id);
  }

  function remove(id) {
    registry.delete(id);
    refreshObserver();
  }

  function refreshObserver() {
    if (observer) observer.disconnect();
    if (!registry.size || defaultSignal.aborted) return;
    observer ||= new MutationObserver(dispatch);
    observer.observe(shadowRoot, computeOptions(registry.values()));
  }

  function dispatch(records) {
    if (defaultSignal.aborted) return;
    for (const reg of registry.values()) {
      const matches = filterRecords(records, reg);
      if (!matches.length) continue;
      callHandler(matches, reg);
      if (reg.once) remove(reg.id);
    }
  }

  defaultSignal.addEventListener('abort', () => {
    observer?.disconnect();
    registry.clear();
  }, { once: true });

  return createWatchProxy(add);
}
```

## 12. Usage with `tags`, `refs`, and `on`

```javascript
mount({ refs, tags, on, watch }) {
  const toggle = refs.toggle ?? tags.one('[data-toggle]');
  const panel = refs.panel;

  watch.attr(toggle, 'aria-expanded', (attr, next) => {
    panel.hidden = next !== 'true';
  });

  on.click('[data-toggle]', (event, target) => {
    const open = target.getAttribute('aria-expanded') === 'true';
    target.setAttribute('aria-expanded', String(!open));
  });
}
```

The click mutates an attribute. `watch.attr` reacts without any manual event dispatch.

## 13. What `watch` Is Not

- It is not cross-component state management.
- It is not a replacement for `on` for user interactions.
- It is not a render scheduler. Heavy handlers should schedule work with `ui.schedule` or `ui.scheduleFrame`.
- It is not for slotted light DOM changes. Use `slotchange` on a `<slot>` element for that.
