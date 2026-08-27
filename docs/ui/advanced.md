# Advanced Topics

Internals, edge cases, and extension points for developers who need to understand or modify the UI layer.

---

## Property Normalization

Props declared as literal values are auto-expanded:

```javascript
// Shorthand
props: { count: 0 }

// Expanded internally
props: { count: { type: Number, default: 0 } }
```

Object configs with a `type` key are passed through unchanged. This lets you mix shorthand and full config:

```javascript
props: {
  count: 0,                              // shorthand
  label: { type: String, reflect: false } // full config
}
```

---

## Route Parameter and Query Contracts

Route parameters (`params`) and queries (`query`) are defined using typed contract arrays on page/dock components. Because they define a strict contract with URLs rather than generic component properties, they are processed separately from `props` and are stored directly on the spec registry.

Unlike `props`, they do not support default values or attribute reflection overrides, but their types (e.g. `String`, `Number`) dictate casting before properties are reactively set on the element.

---

## Update Batching

Property changes are batched to avoid redundant `change` callbacks:

```javascript
el.name = 'Alice';
el.age = 30;
// One change callback fires with both changes
```

The flush mechanism:

- `queueMicrotask` by default (fast, sync-like)
- `requestAnimationFrame` when `visual: true` (smooth, layout-aware)

Set `visual` on the update function:

```javascript
spec.update = (ctx) => { ... };
spec.update.visual = true; // flushes via rAF
```

The definition layer (`page`, `dock`, `view`) sets `visual: true` automatically. `part` does not.

---

## Attribute Sync

When a prop changes programmatically, the corresponding attribute updates (unless `reflect: false`):

```javascript
el.active = true;  // sets active=""
el.active = false; // removes attribute
el.name = null;    // removes attribute
el.name = 'Bob';   // sets name="Bob"
```

When an attribute changes externally (e.g., via `setAttribute`), the property setter is invoked, which triggers the `change` hook.

---

## Memory Safety

Every declarative element manages its own lifecycle via `AbortController`:

- `connectedCallback` creates a fresh controller
- `disconnectedCallback` aborts it
- All async operations should use `ctrl.signal`
- All observer factories accept `ctrl.signal` for auto-cleanup

If an element disconnects while resources are still loading, the `connectedCallback` returns early:

```javascript
if (!this.ctrl || this.ctrl.signal.aborted || !this.isConnected) {
  return;
}
```

---

## Tags Cache Invalidation

The `TagsCache` is pre-warmed by the tags descriptor and cleared by a `MutationObserver` on the shadow root:

```javascript
const observer = new MutationObserver(() => { tags.clear(); });
observer.observe(shadowRoot, { childList: true, subtree: false });
```

This means:

- Static templates: cache is never invalidated after mount
- Dynamic templates (children change): cache is cleared on every mutation

For high-frequency mutations, consider direct DOM references instead of `tags` queries.

---

## Event Delegation Internals

The `on` proxy registers one listener per event type on the shadow root. Handlers are matched via `composedPath()` (same algorithm as `events.delegate`):

```javascript
on.click('.btn', handler);
// Registers one 'click' listener on shadowRoot
// Walks event.composedPath() for the first .btn before the shadow root
```

Passive defaults align with `events.listen` (touch/wheel only). If any remaining handler for a type is non-passive, the root listener is non-passive. When the registry for a type is empty, the root listener is removed immediately.

---

## Framework-global listeners / observers

These are intentional document-adjacent attachments owned by the framework (not component `on` / `watch`). Soft-nav must not accumulate extras:

| Name | Location | Target | Cleanup |
| --- | --- | --- | --- |
| `router.nav-click` | `platform/polyfills/navigation.js` | `document` click | framework lifetime (globals) |
| `router.nav-popstate` | `platform/polyfills/navigation.js` | `window` popstate | framework lifetime (globals) |
| `router.container-mo` | `router/container.js` | `#main` MO | disconnects when selectors found; `clearContainers` |
| `popover.target-click` | `platform/polyfills/popover.js` | `document` click | framework lifetime when polyfill installs |
| `popover.body-mo:*` | `platform/polyfills/popover.js` | parent (preferred) or `body` | disconnect on hide |

Inspect with `import { globals } from '@anzaui/anza/platform'` — `globals.count()` / `globals.list()` (test / diagnostics helper). Prefer `on` / `watch` / `events.*` with `{ signal: ctrl.signal }` for app code. Soft-nav aborts the detached leaf’s `ctrl`; anything attached without that signal survives `replaceChildren` / `swapView`.

Per-instance attachment budget (DEV / tests):

```javascript
import { getAttachmentStats } from '@anzaui/anza/ui';

const stats = getAttachmentStats(el.shadowRoot);
// { onRootListeners, onRegistrations, watchBuckets, watchRegistrations, slotListeners }
// After soft-nav, a detached leaf’s shadow returns null (aborted / cleared).
```

When a container uses element-scoped View Transitions, `swapView` still runs `replaceChildren` inside the VT **update callback** — disconnect / `ctrl.abort()` happens at swap time, not after the transition animation finishes.

Overlay kit notes (native top-layer vs toast body portal, popover polyfill `globals`): [Overlay patterns](../elements/overlay.md).

---

## Non-browser / hydration

The UI layer checks `typeof customElements !== 'undefined'` before defining elements. Outside the browser:

- `element()` is a no-op
- `template()` returns a frozen empty object
- `observe` factories return no-op disposers
- `transition()` returns a resolved promise

Public SEO HTML comes from Mode A SSG or Mode B templates ([contract](../ssg/contract.md)). The client **adopts** open DSD — see [hydration.md](hydration.md). The factory is safe to import in any environment.

---

## Extending BaseElement

Subclass `BaseElement` for imperative elements that need the AbortController pattern but not the full declarative factory:

```javascript
import { BaseElement } from '@anzaui/anza/ui';

class ChartWidget extends BaseElement {
  mount() {
    this.ctrl.signal.addEventListener('abort', () => {
      this.chart.destroy();
    });
    this.renderChart();
  }

  unmount() {
    this.chart?.destroy();
  }
}

customElements.define('chart-widget', ChartWidget);
```

---

## Custom Define

The low-level `define(tag, Class)` helper skips duplicate registrations:

```javascript
import { define } from '@anzaui/anza/ui';

define('my-element', MyClass);
define('my-element', MyClass); // logs warning, skips
```
