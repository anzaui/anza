# Context

Every lifecycle hook receives a frozen context object with helpers for interacting with the element's shadow DOM, events, and observers.

---

## Context Fields

```javascript
{
  el,       // the element instance
  ctrl,     // AbortController (signal aborts on disconnect)
  tags,     // TagsCache for fast shadow DOM queries
  refs,     // named element lookups via ref="name"
  on,       // delegated event proxy
  watch,    // mutation watcher
  internals,// ElementInternals (if form: true)
  params,   // (load hook only) typed dynamic path params array with getters
  query,    // (load hook only) typed query params array with getters
  raw       // (load hook only) raw URLSearchParams object
}
```

---

## el

The element instance itself. Access properties, shadow root, and methods:

```javascript
on: {
  connect({ el }) {
    console.log(el.tagName);      // 'USER-CARD'
    console.log(el.name);       // current prop value
    console.log(el.shadowRoot); // the shadow root
  }
}
```

---

## ctrl

An `AbortController` whose signal aborts when the element disconnects. Pass it to any async operation for automatic cleanup:

```javascript
on: {
  async load({ ctrl }) {
    const res = await fetch('/api', { signal: ctrl.signal });
  }
}
```

When the element is removed, the signal aborts and the fetch is cancelled.

---

## params

An ordered, typed array containing dynamic path parameters extracted from the URL. Available in the `load` hook:

```javascript
on: {
  async load({ params }) {
    // If route is /members/:id
    console.log(params[0]);     // '42'
    console.log(params.first);  // '42'
    console.log(params.id);     // '42'
  }
}
```

Values are automatically cast to their declared contract type (e.g., `Number`).

---

## query

An ordered, typed array containing query parameters mapped from the URL. Available in the `load` hook:

```javascript
on: {
  async load({ query }) {
    // If URL is /search?q=hello&page=2
    console.log(query[0]);     // 'hello'
    console.log(query.first);  // 'hello'
    console.log(query.page);   // 2 (cast to Number)
  }
}
```

---

## raw

The raw `URLSearchParams` object representing all query parameters currently in the URL. Useful for accessing undeclared query keys:

```javascript
on: {
  async load({ raw }) {
    if (raw.has('referrer')) {
      this.referrer = raw.get('referrer');
    }
  }
}
```

---

## tags

A cached query interface for the shadow root. Pre-warmed by the tags descriptor (if available).

```javascript
on: {
  connect({ tags }) {
    const title = tags.one('.title');     // querySelector, cached
    const items = tags.all('.item');      // querySelectorAll, cached
    const hasItems = tags.has('.item');   // boolean
    tags.each('.item', (el, i) => { ... }); // iterate
  }
}
```

The cache is invalidated automatically when shadow DOM children change.

---

## refs

Named element lookups based on `ref="name"` attributes in the template:

```javascript
template: '<div ref="header"><span ref="count">0</span></div>'

on: {
  connect({ refs }) {
    refs.header.classList.add('mounted');
    refs.count.textContent = '1';
  }
}
```

Duplicate `ref` names log a warning. The first match wins.

---

## on

Delegated event proxy. One listener per `(type, capture)` on the **shadow root** handles all matching selectors. Matching walks `event.composedPath()` and stops at the shadow root (same algorithm as [`events.delegate`](../events/delegate.md)). Default scope is the shadow tree — use `events.delegate` / `events.listen` for document roots so those attachments stay greppable.

### Simple

```javascript
on: {
  connect({ on }) {
    on.click('.btn', (event, target) => {
      target.disabled = true;
    });

    on.submit('form', (event, form) => {
      event.preventDefault(); // non-passive by default for submit
    });

    on.input('.search', (event, input) => {
      console.log(input.value);
    });
  }
}
```

```javascript
const dispose = on.click('.btn', handler);
dispose(); // removes this registration; last handler for the type removes the root listener
```

### Advanced

```javascript
on.click('.btn', handler, {
  signal,           // default: ctrl.signal
  once: false,
  capture: false,
  passive: undefined, // default: true only for touchstart|touchmove|wheel|mousewheel
  attrs: {
    'data-action': 'save', // must equal
    'aria-disabled': null  // must be absent
  },
  not: '.ignore',          // skip if match.closest('.ignore') within the root
  key: 'toolbar-save',     // second add with same key replaces the first
  scope: 'assigned'        // also match light-DOM nodes assigned to a slot in this shadow
});

on.click.once('.btn', handler);
```

| Option | Behavior |
| ------ | -------- |
| `attrs` | Predicate on the matched element (`null` = attribute must be absent) |
| `not` | Skip when `match.closest(not)` is inside the shadow root |
| `key` | Dedupe id — re-registering replaces the prior handler |
| `scope: 'assigned'` | Opt into slotted light-DOM matches via `assignedSlot` (default is shadow-only) |

**Passive defaults** match `events.listen`: only scroll-critical types are passive unless you pass `{ passive: false }`. Click / submit / key handlers can call `preventDefault()` without an override.

**Empty teardown:** when the last registration for a `(type, capture)` key is disposed (or aborted), the shadow-root `addEventListener` is removed immediately — no idle root listener left behind.

Direct `Element` targets must live inside this shadow; targets outside warn and return a no-op disposer.

---

## watch

Shadow-scoped mutation helpers. Prefer typed kinds (`attr` / `kids` / `text` / `slot`) over `tree`. Observers are **bucketed by fingerprint** so a wide `tree` or `attr *` registration never drops `attributeFilter` / `subtree` on a neighbor.

Canonical child API is `watch.kids`; `watch.children` is an alias.

### Simple

```javascript
on: {
  connect({ watch, refs }) {
    watch.text(refs.counter, (text, old, el) => {
      console.log('Counter:', text);
    });

    watch.attr(refs.submit, 'disabled', (attr, next, prev, el) => {
      el.dataset.wasDisabled = String(prev !== null);
    });

    watch.kids(refs.list, ({ added, removed }, list) => {
      console.log(added.length, removed.length);
    });
  }
}
```

### Advanced

```javascript
on: {
  connect({ watch, refs }) {
    // Named attrs keep attributeFilter; tree lives in a separate bucket
    watch.attr(refs.toggle, 'aria-pressed', handler);
    watch.tree(refs.editor, (records) => { /* escape hatch */ });

    // Fail closed when the selector matches nothing at register time
    watch.attr('.late-btn', 'disabled', handler, { requirePresent: true });

    // Slot / light-DOM boundary (slotchange — not a document MO)
    watch.slot(refs.body, ({ assigned, assignedElements }, slot) => {
      console.log(assignedElements.length);
    });

    watch.kids(refs.list, { deep: true }, ({ added }) => { /* descendants */ });
    watch.attr.once(refs.panel, 'open', handler);
    watch.slot.once('slot[name=actions]', handler);
  }
}
```

| Kind | Handler | Notes |
| ---- | ------- | ----- |
| `watch.attr(target, name\|names\|'*', handler, opts)` | `(attr, next, prev, el)` | Prefer named attrs over `*` |
| `watch.kids(target, handler, opts)` / `{ deep }` | `({ added, removed }, el)` | `children` alias |
| `watch.text(target, handler, opts)` | `(text, old, el)` | Character data under target |
| `watch.tree(target, handler, opts)` | `(records, el)` | Wide escape hatch; isolated bucket |
| `watch.slot(slot\|selector, handler, opts)` | `({ assigned, assignedElements }, slot)` | `slotchange` on `<slot>` |

Options: `{ signal, once, requirePresent }` (or pass an `AbortSignal` as the last arg). Default signal is `ctrl.signal`. Every call returns a disposer. Selector targets with zero current matches still observe for late bind unless `requirePresent: true` (then no-op + warn). Direct targets outside the shadow throw in development and no-op in production.

Diagnostics: [`getAttachmentStats(shadowRoot)`](api.md) reports live `on` / `watch` / slot counts for soft-nav leak tests.

---

## internals

`ElementInternals` when `form: true` is declared. Provides form participation and custom state:

```javascript
view('toggle-switch', {
  form: true,
  props: {
    checked: { type: Boolean, state: true }
  },
  on: {
    connect({ el, internals }) {
      internals.setFormValue(el.checked ? 'on' : '');
    }
  }
});
```
