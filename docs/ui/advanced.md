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

The `on` proxy registers one listener per event type on the shadow root. Handlers are matched via `event.target.closest(selector)`:

```javascript
on.click('.btn', handler);
// Registers one 'click' listener on shadowRoot
// Checks event.target.closest('.btn') for each click
```

Passive vs non-passive is auto-detected. If any handler for an event type is non-passive, the root listener is registered as non-passive.

---

## SSR Considerations

The UI layer checks `typeof customElements !== 'undefined'` before defining elements. On the server:

- `element()` is a no-op
- `template()` returns a frozen empty object
- `observe` factories return no-op disposers
- `transition()` returns a resolved promise

For SSR, define elements during build or client hydration. The factory is safe to import in any environment.

---

## Extending BaseElement

Subclass `BaseElement` for imperative elements that need the AbortController pattern but not the full declarative factory:

```javascript
import { BaseElement } from '@adukiorg/anza/ui';

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
import { define } from '@adukiorg/anza/ui';

define('my-element', MyClass);
define('my-element', MyClass); // logs warning, skips
```
