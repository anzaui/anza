# Lifecycle

Declarative elements have six lifecycle hooks. Each receives a context object with `el`, `ctrl`, `tags`, `refs`, `on`, `watch`, and `internals`.

---

## Hook Map

| Definition Layer | Factory Layer | When It Fires | Async? |
| ----------------- | --------------- | --------------- | -------- |
| `on.load` | `spec.mount` | After resources load, before `connect` | yes |
| `on.connect` | `spec.mount` (after load) | Element connected to DOM | yes |
| `on.disconnect` | `spec.unmount` | Element disconnected from DOM | no |
| `on.change` | `spec.update` | Prop value changes (batched) | no |

---

## load

Runs once per mount, after template and style resources have resolved. Use it for initial data fetching:

```javascript
on: {
  async load({ params, query, raw, ctrl }) {
    // Access dynamic path params (e.g. /user/:id)
    const userId = params.id ?? params[0];
    
    // Access query params (e.g. ?tab=posts)
    const activeTab = query.tab ?? query[0];

    const data = await fetch(`/api/user/${userId}?tab=${activeTab}`, { signal: ctrl.signal });
    this.user = await data.json();
  }
}
```

The context object passed to `load` provides routing contracts parameters:
- `params`: An ordered array containing dynamic path parameters, with cast values and convenience getters (`.first`, `.last`, and named accessors matching the path segment names).
- `query`: An ordered array containing query parameters mapped via the `query` contract, with cast values and convenience getters.
- `raw`: The raw `URLSearchParams` object representing all query parameters currently in the URL.
- `ctrl.signal`: Aborts the fetch automatically if the element disconnects.

`load` is awaited before `connect` runs. If `load` throws, `connect` still runs — the error is logged but not propagated.

---

## connect

Runs after `load`, when the element is fully connected:

```javascript
on: {
  connect({ el, refs, on, watch }) {
    refs.title.textContent = el.name;
    on.click('.btn', handleClick);
    watch.text('.counter', handleTextChange);
  }
}
```

Attach event listeners, observers, and set up reactive bindings here.

---

## disconnect

Runs when the element is removed from the DOM:

```javascript
on: {
  disconnect({ el }) {
    console.log('cleaning up', el.tagName);
  }
}
```

The `AbortController` (`ctrl`) is aborted automatically, so any listeners or observers bound to `ctrl.signal` clean up without manual work.

### Soft-nav contract

Soft-nav swaps only the **page leaf** (`replaceChildren` / `swapView`). Parent docks stay mounted.

```text
connect / mount
  ctrl = new AbortController()
  on + watch bind to shadowRoot with defaultSignal = ctrl.signal

soft-nav (same via chain)
  parent docks: keep their on / watch / globals
  old leaf: disconnect → unmount → ctrl.abort()
    → on registries clear; watch buckets disconnect; tags MO disconnect
    → events.listen / delegate / observe that used ctrl.signal dispose
  new leaf: fresh ctrl + fresh on / watch

hard refresh
  new document; adopt open DSD; same connect path
```

Author rules:

1. Never `document.addEventListener` / `new MutationObserver` in `mount` without `{ signal: ctrl.signal }` or a disposer from `unmount`.
2. Prefer `on` / `watch` inside components; prefer `events.*` + signal outside.
3. Do not observe `document` / `body` for leaf concerns — lift to a parent dock or use events/store.
4. Framework globals (`router.nav-click`, `router.container-mo`, `popover.*`) stay stable across soft-nav — see [advanced.md](advanced.md#framework-global-listeners--observers).

---

## change

Runs when a declared prop changes. Multiple rapid changes are batched into one callback:

```javascript
on: {
  change({ name, val, old, el, refs }) {
    if (name === 'name') {
      refs.title.textContent = val;
    }
    if (name === 'active') {
      el.classList.toggle('active', val);
    }
  }
}
```

The context includes:

| Field | Description |
| ------- | ------------- |
| `name` | The prop name that changed |
| `val` | The new value |
| `old` | The previous value |
| `prev` | Alias for `old` |
| `el` | The element instance |
| `ctrl` | The AbortController |
| `tags` | TagsCache for shadow DOM queries |
| `on` | Event delegator |
| `refs` | Named element refs |
| `watch` | Mutation watcher |

---

## Batching

Property changes are collected and flushed in one callback. The flush strategy depends on the `visual` flag:

- `visual: true` — flushes via `requestAnimationFrame` (smooth, layout-aware)
- `visual: false` (default) — flushes via `queueMicrotask` (fast, synchronous-feeling)

Set `visual: true` on the definition layer:

```javascript
page('/', {
  tag: 'page-home',
  template: { html: './home.html', css: './home.css' }
  // visual: true is set automatically by page(), dock(), view()
});
```

`part()` uses `visual: false` because stateless primitives do not need rAF batching.

---

## Lifecycle Order

For a newly created element:

1. Constructor runs — props initialize from attributes
2. `connectedCallback` — resources load, `AbortController` created
3. `load` hook — initial data fetching
4. `connect` hook — DOM ready, listeners attached
5. Prop changes → `change` hook (batched)
6. `disconnect` hook — cleanup
7. `disconnectedCallback` — `AbortController` aborted
