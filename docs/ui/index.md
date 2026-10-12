---
title: "UI"
order: 3
---

# UI

The Anza UI layer builds custom elements from a config object. It gives you typed props, lifecycle hooks, template and style loading, event delegation, mutation watching and scheduling. Every element gets an `AbortController` that aborts when it disconnects, so listeners bound to its signal clean up on their own.

The layer has three levels:

1. **Definitions**: `page()`, `dock()`, `view()`, `part()`. Use these to declare elements.
2. **Factory**: `element()` and `define()`. The definitions compile to `element()` specs.
3. **Utilities**: `template()`, `transition()`, `schedule()`, `observe`.

## What you get

- **Config, not classes**: one object per element.
- **Props**: typed properties that reflect to attributes and call `change` once per changed prop per flush.
- **Templates and styles**: inline strings or files next to the module. Files load on first use and are inlined into the module by `anza build`.
- **Lifecycle hooks**: `load`, `connect`, `disconnect`, `change`.
- **Event delegation**: `on.click('.btn', handler)`, one listener per event type on the shadow root.
- **Mutation watching**: `watch.attr`, `kids`, `text`, `slot`, `tree`.
- **Refs**: elements marked `ref="name"`, looked up once per mount.
- **Observers**: `ResizeObserver`, `IntersectionObserver`, `MutationObserver` and `PerformanceObserver` that disconnect when a signal aborts.
- **Scheduling**: `schedule()`, `scheduleFrame()`, `yield()`.
- **View transitions**: `transition()`, which falls back to a direct update.

## Package

```javascript
import { ui, BaseElement } from '@anzaui/anza/ui';
import { page, dock, view, part } from '@anzaui/anza/defs';
```

Both entry points need a DOM. Importing them in Node throws `ReferenceError: HTMLElement is not defined`. Load them only from browser code.

## Quick start

Define a component with `view()`. The tag name must contain a hyphen.

```javascript
import { view } from '@anzaui/anza/defs';

view('click-counter', {
  props: { count: 0 },
  template: '<button type="button">Clicked <span ref="count">0</span> times</button>',
  style: ':host { display: inline-block; }',
  on: {
    connect({ el, refs, on }) {
      refs.count.textContent = el.count;
      on.click('button', () => {
        el.count++;
      });
    },
    change({ name, val, refs }) {
      if (name === 'count') refs.count.textContent = val;
    }
  }
});
```

Use it in HTML:

```html
<click-counter count="3"></click-counter>
```

What happens:

- `props: { count: 0 }` declares a `Number` prop. The `count="3"` attribute sets its first value.
- `connect` runs once the template is in the shadow root. It renders the first value and binds the click handler. The handler is removed when the element disconnects.
- Each click sets `el.count`. The new value is written back to the `count` attribute, and `change` runs on the next animation frame.

Next:

- [Props](props.md): types, reflection, `:state()`.
- [Templates](templates.md): file templates and the tags descriptor.
- [Lifecycle](lifecycle.md): hook order, `anza:ready`, memory safety.
- [Context](context.md): `refs`, `tags`, `on`, `watch`.

## Pages in this section

| Page | What it covers |
| ---- | -------------- |
| [element() factory](factory.md) | The `element()` spec, resource loading, HMR, `define()`, `BaseElement` |
| [Props](props.md) | Types, reflection, `:state()`, update batching |
| [Templates](templates.md) | Inline and file templates, build-time inlining, tagged templates |
| [Lifecycle](lifecycle.md) | Hooks, order, `anza:ready`, soft-nav abort, memory safety |
| [Context](context.md) | `el`, `ctrl`, `tags`, `refs`, `on`, `watch`, `internals`, `adopted` |
| [Hydration (DSD adopt)](hydration.md) | Adopting pre-rendered Declarative Shadow DOM |
| [Form-associated elements](form-associated.md) | `form: true`, `ElementInternals`, form hooks |
| [Scheduling](scheduling.md) | `schedule`, `scheduleFrame`, `yield` |
| [Observers](observers.md) | Observer factories with `AbortSignal` cleanup |
| [Transitions](transitions.md) | View transitions for docks and DOM swaps |
| [API Reference](api.md) | Every export and option |
| [Troubleshooting](troubleshooting.md) | Common problems |

For CSS loading and tokens, see [Styles](../styles/index.md). For the shipped `ui-*` elements, see [Elements](../elements/index.md).
