# API Reference

Complete reference for the UI facade and definition layer.

---

## UI Facade

```javascript
import { ui } from '@adukiorg/anza/ui';
```

### `ui.define(tag, Class)`

Register a custom element with duplicate guard.

```javascript
ui.define('my-element', MyClass);
```

### `ui.element(tag, spec, base)`

Declarative element factory. See [elements.md](elements.md).

### `ui.container(tag, spec, base)`

Container factory with swap interface. See router docks.md.

### `ui.page(route, config, base)`

Route-bound element. See router pages.md.

### `ui.dock(name, config, base)`

Container shell. See router docks.md.

### `ui.view(tag, config, base)`

Stateful component. See [components.md](components.md) in router docs.

### `ui.part(tag, config, base)`

Stateless primitive. See [components.md](components.md) in router docs.

### `ui.schedule(fn, priority)`

Cooperative task scheduling.

| Priority | Value |
| ---------- | ------- |
| `ui.Priority.BLOCKING` | `'user-blocking'` |
| `ui.Priority.VISIBLE` | `'user-visible'` |
| `ui.Priority.BACKGROUND` | `'background'` |

### `ui.scheduleFrame(fn)`

Run during next `requestAnimationFrame`. Returns a promise.

### `ui.yield()`

Yield control to the browser. Returns a promise.

### `ui.transition(fn)`

View transitions wrapper. Returns a promise resolving to a transition object.

### `ui.template(strings, ...values)`

Tagged template literal factory. Returns a `DocumentFragment`.

### `ui.observe.resize(el, fn, signal)`

ResizeObserver with AbortSignal cleanup.

### `ui.observe.intersection(el, fn, signal, options)`

IntersectionObserver with AbortSignal cleanup.

### `ui.observe.mutation(el, fn, signal, options)`

MutationObserver with AbortSignal cleanup.

### `ui.observe.performance(types, fn, signal, options)`

PerformanceObserver with AbortSignal cleanup.

---

## Named Exports

```javascript
import { BaseElement } from '@adukiorg/anza/ui';
import { define, element, container, page, dock, view, part } from '@adukiorg/anza/ui';
import { schedule, scheduleFrame, yieldTask } from '@adukiorg/anza/ui';
import { transition } from '@adukiorg/anza/ui';
import { template } from '@adukiorg/anza/ui';
import { observe } from '@adukiorg/anza/ui';
```

---

## Definition Layer Exports

```javascript
import { page, dock, view, part } from '@adukiorg/anza/defs';
```

### `page(route, config, base)`

Define a route-bound element.

- **`route`**: `string | string[]` - A single route pattern or an array of route patterns (e.g. `'/blog'` or `['/blog', '/blog/:slug']`).
- **`config` fields**: `tag`, `via`, `container`, `template`, `style`, `props`, `params`, `query`, `hash`, `on`, `guard`, `meta`.
  - `params`: `Array<{ name: string, type: Function }>` - path parameter contract (e.g., `[{ name: 'slug', type: String }]`).
  - `query`: `Array<{ name: string, type: Function }>` - query parameter contract (e.g., `[{ name: 'tab', type: String }]`).

### `dock(name, config, base)`

Define a container shell.

- **`config` fields**: `tag`, `parent`, `template`, `style`, `params`, `query`, `on`, `notfound`.
  - `params`: `Array<{ name: string, type: Function }>` - path parameter contract.
  - `query`: `Array<{ name: string, type: Function }>` - query parameter contract.

Default tag: `dock-<name>`. Default parent: `'body'`.

### `view(tag, config, base)`

Define a stateful component.

Config: `tag`, `template`, `style`, `props`, `on`, `methods`.

### `part(tag, config, base)`

Define a stateless primitive.

Config: `tag`, `template`, `style`, `props`, `on`, `methods`.

Warns if `on.change` is declared.

---

## Spec Config Shape

```javascript
{
  template: string | { html: string, css: string | string[], shadow: 'open' | 'closed' },
  style: string | string[],
  mode: 'open' | 'closed',
  props: {
    name: { type: String | Number | Boolean, default: any, reflect: boolean, state: boolean }
  },
  params: Array<{ name: string, cast: 'string' | 'number' }>,
  query: Array<{ name: string, cast: 'string' | 'number' }>,
  mount: (ctx) => any,
  unmount: (ctx) => any,
  update: (ctx) => any,
  methods: { methodName: fn },
  url: string,
  container: string,
  form: boolean,
  associated: (form) => any,
  disabled: (value) => any,
  reset: () => any,
  restore: (state, mode) => any
}
```

---

## Context Shape

```javascript
{
  el: HTMLElement,
  ctrl: AbortController,
  tags: TagsCache,
  refs: Record<string, Element>,
  on: EventDelegator,
  watch: MutationWatcher,
  internals: ElementInternals | null
}
```

---

## TagsCache Methods

```javascript
tags.one(selector)     // querySelector, cached
tags.all(selector)     // querySelectorAll, cached
tags.each(selector, fn) // iterate over matches
tags.has(selector)     // boolean
tags.clear()           // invalidate cache
tags.prewarmId(id)     // pre-warm by ID
tags.prewarm(selector, element) // manual pre-warm
```

---

## Event Delegator Methods

```javascript
on.click(selector, handler, options)
on.submit(selector, handler, options)
on.input(selector, handler, options)
on[eventType](selector, handler, options)
```

Options: `signal` (AbortSignal), `once` (boolean), `passive` (boolean), `capture` (boolean).

Returns a disposer function.

---

## Mutation Watcher Methods

```javascript
watch.text(selector, callback)      // (text, old, el) => {}
watch.attr(selector, attr, callback) // (val, old, el) => {}
watch.children(selector, callback)   // (mutations) => {}
```

Returns a disposer function.
