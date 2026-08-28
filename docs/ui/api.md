# API Reference

Complete reference for the UI facade and definition layer.

## UI Facade

```javascript
import { ui } from '@anzaui/anza/ui';
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

Stateful component. See [router/components.md](../router/components.md).

### `ui.part(tag, config, base)`

Stateless primitive. See [router/components.md](../router/components.md).

### `ui.schedule(fn, priorityOrOptions)`

Cooperative task scheduling. Second arg may be a priority string or `{ priority, signal, delay }`.

| Priority | Value |
| ---------- | ------- |
| `ui.Priority.BLOCKING` | `'user-blocking'` |
| `ui.Priority.VISIBLE` | `'user-visible'` |
| `ui.Priority.BACKGROUND` | `'background'` |

### `ui.scheduleFrame(fn, options?)`

Run during next `requestAnimationFrame`. Options: `{ signal }`. Returns a promise.

### `ui.yield(options?)`

Yield control to the browser. Options: `{ signal }`. Returns a promise.

### `ui.transition(fn, options?)`

View transitions wrapper (document or element scope). Returns a promise resolving to a transition object. See [transitions.md](transitions.md).

### `ui.runSwapTransition(host, fn, options?)`

Element-scoped dock/container swap helper with direct-swap fallback.

### `ui.configureTransitions(partial)`

Global `{ enabled, nameFor }` controls for VT.

### `ui.template(strings, ...values)`

Tagged template literal factory. Returns a `DocumentFragment`.

### `ui.observe.resize(el, fn, signal)`

ResizeObserver with AbortSignal cleanup.

### `ui.observe.intersection(el, fn, signal, options)`

IntersectionObserver with AbortSignal cleanup.

### `ui.observe.mutation(el, fn, signal, options)`

MutationObserver with AbortSignal cleanup. Default options: `{ childList: true, subtree: false }`. Prefer a scoped root over `document` / `body` with `subtree: true`. When `attributes: true` without `attributeFilter`, a development warning is emitted.

### `ui.observe.mutation.scoped(shadowRoot, selector, fn, signal, options)`

Filters mutation records to targets matching `selector` inside a shadow root. Refuses `document` / `body` roots (dev warn + no-op). Default observe options include `subtree: true` under that shadow.

### `ui.observe.performance(types, fn, signal, options)`

PerformanceObserver with AbortSignal cleanup.

### `ui.getAttachmentStats(shadowRoot)`

Snapshot of live component attachments for diagnostics / soft-nav leak tests. Returns `null` if the shadow was never bound (or already aborted and cleared):

```javascript
{
  onRootListeners,    // shadow-root listeners currently attached
  onRegistrations,    // handler registrations across types
  watchBuckets,       // distinct MutationObserver fingerprints
  watchRegistrations, // active watch.* regs (not slot)
  slotListeners       // active watch.slot slotchange listeners
}
```

Also available as a named export: `import { getAttachmentStats } from '@anzaui/anza/ui'`.

## Named Exports

```javascript
import { BaseElement, getAttachmentStats } from '@anzaui/anza/ui';
import { define, element, container, page, dock, view, part } from '@anzaui/anza/ui';
import { schedule, scheduleFrame, yieldTask } from '@anzaui/anza/ui';
import { transition } from '@anzaui/anza/ui';
import { template } from '@anzaui/anza/ui';
import { observe } from '@anzaui/anza/ui';
```

## Definition Layer Exports

```javascript
import { page, dock, view, part } from '@anzaui/anza/defs';
```

### `page(route, config, base)`

Define a route-bound element.

- **`route`**: `string | string[]` - A single route pattern or an array of route patterns (e.g. `'/blog'` or `['/blog', '/blog/:slug']`).
- **`config` fields**: `tag`, `via`, `container`, `template`, `style`, `props`, `params`, `query`, `hash`, `on`, `guard`, `error`, `meta`.
  - `params`: `Array<{ name: string, type: Function }>` - path parameter contract (e.g., `[{ name: 'slug', type: String }]`).
  - `query`: `Array<{ name: string, type: Function }>` - query parameter contract (e.g., `[{ name: 'tab', type: String }]`).
  - `error` (optional): route-scoped error leaf override — see [router/fallbacks.md](../router/fallbacks.md).

### `dock(name, config, base)`

Define a container shell.

- **`config` fields**: `tag`, `parent`, `template`, `style`, `params`, `query`, `on`, `notfound`, `error`, `offline`.
  - `notfound` / `error` / `offline` (optional): branded overrides only — bare docks use shared library built-ins; see [router/fallbacks.md](../router/fallbacks.md).
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

## Event Delegator Methods

```javascript
on.click(selector, handler, options)
on.submit(selector, handler, options)
on.input(selector, handler, options)
on[eventType](selectorOrElement, handler, options)
on[eventType].once(selectorOrElement, handler, options)
```

Matching walks `composedPath()` within the shadow root (same matcher as `events.delegate`). Selector strings or direct Element references (inside the shadow) are accepted.

| Option | Type | Description |
| ------ | ---- | ----------- |
| `signal` | AbortSignal | Default: component `ctrl.signal` |
| `once` | boolean | Remove after first match |
| `passive` | boolean | Default: true only for touch/wheel types |
| `capture` | boolean | Capture phase (separate root listener key) |
| `attrs` | object | Attribute predicates (`null` = must be absent) |
| `not` | string | Skip when `closest(not)` is inside the root |
| `key` | string\|number | Dedupe — same key replaces prior registration |
| `scope` | `'shadow'` \| `'assigned'` | Default shadow-only; `assigned` includes slotted light DOM |

Empty registry for a `(type, capture)` key removes the shadow-root listener immediately. See [context.md](context.md#on).

Returns a disposer function.

## Mutation Watcher Methods

```javascript
watch.attr(target, attr, handler, options)   // (attr, next, prev, el) => {}
watch.kids(target, handler, options)         // ({ added, removed }, el) => {}
watch.kids(target, { deep: true }, handler, options)
watch.children(target, handler, options)     // alias of watch.kids
watch.text(target, handler, options)         // (text, old, el) => {}
watch.tree(target, handler, options)         // (records, target) => {}
watch.slot(slotOrSelector, handler, options) // ({ assigned, assignedElements }, slot) => {}
watch.attr.once(...) / kids.once / text.once / tree.once / slot.once
```

`target` is a shadow-scoped selector or Element. Options: `{ signal, once, requirePresent }` (or a bare `AbortSignal`). Observers are bucketed by option fingerprint so a `tree` / `attr *` registration cannot widen another watch’s `attributeFilter`. `watch.slot` uses `slotchange` (not a MutationObserver). See [context.md](context.md#watch).

Returns a disposer function.
