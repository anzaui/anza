# UI

The Anza UI layer is a declarative custom element system built on Web Components. It provides reactive properties, lifecycle hooks, template and style loading, event delegation, mutation watching, and cooperative scheduling — all with automatic memory management via AbortController.

The UI layer is organized into three levels:

1. **Definition layer** — `page()`, `dock()`, `view()`, `part()` — the way you declare elements
2. **Factory layer** — `element()`, `define()` — the engine that compiles specs into custom elements
3. **Utilities** — `template()`, `transition()`, `schedule()`, `observe` — helpers for DOM, animation, and performance

---

## What You Get

- **Declarative element definition** — define custom elements with a config object instead of a class
- **Reactive props** — typed properties with automatic attribute reflection and batched update callbacks
- **Template loading** — inline strings, file paths (`.html`), or tagged template literals
- **Style loading** — inline CSS, file paths (`.css`), or constructable stylesheets with HMR
- **Lifecycle hooks** — `load`, `connect`, `disconnect`, `change` with automatic cleanup
- **Event delegation** — `on.click('.btn', handler)` with `composedPath` matching, `attrs` / `not` / `key` / `scope`
- **Mutation watching** — `watch.attr` / `kids` / `text` / `slot` / `tree` with observer buckets
- **Tags cache** — fast cached queries for shadow DOM elements
- **Refs** — named element lookups via `ref="name"` attributes
- **Safe observers** — `ResizeObserver`, `IntersectionObserver`, `MutationObserver`, `PerformanceObserver` with AbortSignal cleanup
- **Cooperative scheduling** — `schedule()`, `scheduleFrame()`, `yield()` for main-thread-friendly work
- **View transitions** — `transition()` wrapper with reduced-motion respect

---

## Package

```javascript
import { ui } from '@anzaui/anza/ui';
import { page, dock, view, part } from '@anzaui/anza/defs';
import { BaseElement } from '@anzaui/anza/ui';
```

---

## File Map

| File | What It Covers |
| ----- | ---------------- |
| [quickstart.md](quickstart.md) | Your first component in five minutes |
| [elements.md](elements.md) | The `element()` factory and spec shape |
| [props.md](props.md) | Reactive properties, types, reflection, state |
| [templates.md](templates.md) | Inline, file-based, and tagged template literals |
| [styles/index.md](../styles/index.md) | CSS loading, constructable stylesheets, HMR |
| [lifecycle.md](lifecycle.md) | Mount, unmount, connect, disconnect, load, change; soft-nav abort |
| [context.md](context.md) | `el`, `ctrl`, `tags`, `refs`, `on`, `watch` (precision + buckets) |
| [scheduling.md](scheduling.md) | Cooperative task scheduling |
| [observers.md](observers.md) | Safe observer factories; `mutation.scoped` |
| [transitions.md](transitions.md) | View transitions wrapper |
| [forms.md](forms.md) | Form-associated custom elements |
| [hydration.md](hydration.md) | Adopt open DSD from SSG / Mode B HTML |
| [advanced.md](advanced.md) | Internals, globals, `getAttachmentStats` |
| [api.md](api.md) | Complete API reference |
| [troubleshooting.md](troubleshooting.md) | Common problems and how to fix them |

---

## One-File Example

```javascript
import { view } from '@anzaui/anza/defs';

view('user-card', {
  props: {
    name: { type: String, default: 'Guest' },
    active: { type: Boolean }
  },
  template: `
    <div class="card">
      <h2 ref="title">{{ name }}</h2>
      <span class="badge" hidden="">{{ active }}</span>
    </div>
  `,
  on: {
    connect({ el, refs }) {
      refs.title.textContent = el.name;
    },
    change({ name, val, refs }) {
      if (name === 'name') refs.title.textContent = val;
    }
  }
});
```

Use it in HTML:

```html
<user-card name="Alice" active></user-card>
```

---

## Next Steps

- New to the UI layer? Start with [quickstart.md](quickstart.md).
- Want reactive properties? Read [props.md](props.md) and [lifecycle.md](lifecycle.md).
- Building complex layouts? See [context.md](context.md) for `tags`, `refs`, `on`, and `watch`.
- Need performance? [scheduling.md](scheduling.md) and [observers.md](observers.md).
- Prefer a single reference page? [api.md](api.md).
- Looking for shipped `ui-*` components? [Elements kit](../elements/index.md) (overlays: [patterns](../elements/overlay.md)).
