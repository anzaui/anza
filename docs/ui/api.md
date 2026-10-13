---
title: "API Reference"
order: 11
description: "Reference for the Anza UI layer: the ui facade, named exports, page/dock/view/part config, the element() spec, the hook context, on and watch."
---

# API Reference

Reference for `@anzaui/anza/ui` and `@anzaui/anza/defs`. Both need a DOM; see [Hydration (DSD adopt)](hydration.md#browser-only).

## ui facade

```javascript
import { ui } from '@anzaui/anza/ui';
```

| Member | Description |
| ------ | ----------- |
| `ui.define(tag, Class)` | Register a class. Warns and skips a tag that is already defined. |
| `ui.element(tag, spec, base)` | Declarative element factory. See [element() factory](factory.md). |
| `ui.container(tag, spec, base)` | `element()` plus router container registration. See below. |
| `ui.page`, `ui.dock`, `ui.view`, `ui.part` | The definition functions, as below. |
| `ui.schedule(fn, priorityOrOptions)` | Run `fn` as a task. Returns a promise of its result. |
| `ui.scheduleFrame(fn, { signal })` | Run `fn` in the next animation frame. Returns a promise. |
| `ui.yield({ signal })` | Yield to the browser. Returns a promise. |
| `ui.Priority` | `{ BLOCKING: 'user-blocking', VISIBLE: 'user-visible', BACKGROUND: 'background' }` |
| `ui.transition(fn, options)` | View transition around a DOM update. See [Transitions](transitions.md). |
| `ui.runSwapTransition(host, fn, options)` | Element-scoped swap used by docks. |
| `ui.configureTransitions({ enabled, nameFor })` | Global transition settings. |
| `ui.getTransitionConfig()` | Current `{ enabled, nameFor }`. |
| `ui.prefersReducedMotion()` | `true` when the user asks for reduced motion. |
| `ui.shouldAnimate(options)` | Whether a transition would run for these options. |
| `ui.dockTransitionName(el, dockName)` | Default `view-transition-name` for a dock. |
| `ui.template` | Tagged template literal that returns a `DocumentFragment`. See [Templates](templates.md#tagged-template-literal). |
| `ui.observe` | Observer factories. See [Observers](observers.md). |
| `ui.theme` | Theme helpers. See [Styles](../styles/index.md). |
| `ui.getAttachmentStats(shadowRoot)` | Live `on` / `watch` counts. See [Lifecycle](lifecycle.md#attachment-stats). |

### `ui.define(tag, Class)`

```javascript
import { define } from '@anzaui/anza/ui';

class HelloBanner extends HTMLElement {}
define('hello-banner', HelloBanner);
```

Returns nothing. Does nothing when `customElements` is missing. This is the only function that warns about a duplicate tag; `element()` and the definition functions skip a defined tag silently.

### `ui.container(tag, spec, base)`

The older way to declare a router container. Prefer `dock()` ([Docks](../router/docks.md)).

- `spec` is an `element()` spec. It also accepts `transition` (`false`, or `{ name }`), like a dock.
- Adds `:host { contain: layout; display: block; }` before `spec.style`, inside a cascade layer so your own `:host` rules win. `spec.style` can be a CSS string, a file path or an array of both.
- On mount, registers the element with the router under its `name` attribute (default: the tag). A second live instance with the same name throws `ContainerError`, which is logged as a mount failure. On unmount, unregisters it.
- Adds `swapView(newElement, { direction, transition, name, signal })`, which replaces the children inside an element-scoped transition.

```javascript
import { ui } from '@anzaui/anza/ui';

ui.container('app-shell', {
  template: '<slot></slot>',
  transition: { name: 'app-shell' }
});
```

## Named exports

```javascript
import {
  BaseElement, define, element, container, page, dock, view, part,
  schedule, scheduleFrame, yieldTask, Priority,
  transition, runSwapTransition, configureTransitions, getTransitionConfig,
  prefersReducedMotion, shouldAnimate, dockTransitionName,
  skipHostTransition, hasDocumentViewTransition, hasElementViewTransition,
  template, observe, theme, getAttachmentStats
} from '@anzaui/anza/ui';
```

`yieldTask` is `ui.yield`. `skipHostTransition(host)` skips a host's in-flight swap transition. `hasDocumentViewTransition()` and `hasElementViewTransition(el)` report API support.

## Definition functions

```javascript
import { page, dock, view, part } from '@anzaui/anza/defs';
```

All four take `base` (`import.meta.url`) as the last argument when they use relative files. Their `template` may be a string or `{ html, css, shadow }`; a top-level `style` replaces `template.css`. They accept `props`, `form`, `eager`, `methods` and `on`. Hooks under `on` are `load`, `connect`, `disconnect` and `change`; other functions under `on` become methods.

`eager: true` fetches file resources (template, styles, tags descriptor) when the element is defined. By default they load when the first instance connects.

### `page(route, config, base)`

A route-bound element. `route` is a pattern or an array of patterns (`'/blog'`, `['/blog', '/blog/:slug']`). See [Pages](../router/pages.md).

| Field | Description |
| ----- | ----------- |
| `tag` | Required. Custom element tag. |
| `via` | Container chain, root to leaf. The last entry is where the page renders. |
| `container` | Single container; older form of `via`. |
| `params` | `Array<{ name, type }>` path contract. `type` is `String` or `Number`. |
| `query` | `Array<{ name, type }>` query contract. |
| `guard` | Route guard; runs only for this page's patterns. |
| `error` | Error leaf for this route. See [Fallbacks (404 / 5xx / offline)](../router/fallbacks.md). |
| `loading` | Soft-nav loading UI for this page; `false` disables it. |
| `seo` | `{ title, description, canonical, image }`, read at build time. |
| `meta` | Extra route metadata. |
| `template`, `style`, `props`, `form`, `eager`, `methods`, `on` | As above. `change` runs in the next animation frame. |

### `dock(name, config, base)`

A persistent container. See [Docks](../router/docks.md).

| Field | Description |
| ----- | ----------- |
| `tag` | Default `dock-<name>`. |
| `parent` | Parent dock name. Default `'main'`. |
| `template` | Default `'<slot></slot>'`. |
| `transition` | `false` disables the swap transition; `{ name }` replaces `dock-<name>`. |
| `notfound`, `error`, `offline` | Fallback leaves for this subtree. See [Fallbacks (404 / 5xx / offline)](../router/fallbacks.md). |
| `loading` | Soft-nav loading UI for this subtree; `false` disables it. |
| `style`, `props`, `form`, `eager`, `methods`, `on` | As above. `change` runs in a microtask. |

### `view(tag, config, base)`

A stateful component with no route. `change` runs in the next animation frame. See [Components](../router/components.md).

### `part(tag, config, base)`

A stateless primitive. It never calls `change`; declaring `on.change` logs a warning. See [Components](../router/components.md).

## element() spec

```javascript
const spec = {
  template: '<p ref="text"></p>',           // string: inline HTML or .html path
  style: [':host { display: block; }'],     // string or array: CSS or .css paths
  eager: false,
  props: {
    name: { type: String, default: null, reflect: true, state: false }
  },
  mount(ctx) {},
  unmount(ctx) {},
  update(ctx) {},                           // update.visual = true: next frame
  methods: { refresh() {} },
  form: false,
  associated(form) {},
  disabled(value) {},
  reset() {},
  restore(state, mode) {}
};
```

See [element() factory](factory.md#spec-shape) for each field.

## Context

```javascript
const ctx = {
  el,         // the element
  ctrl,       // AbortController; aborts on disconnect
  tags,       // TagsCache
  refs,       // frozen { [ref]: Element }
  on,         // event delegator
  watch,      // mutation watcher
  internals,  // ElementInternals with form: true, else undefined
  adopted     // mount only: true for a pre-rendered shadow root
};
```

`update` gets `el`, `ctrl`, `tags`, `on`, `refs`, `watch`, `internals`, `name`, `val`, `old` and `prev`. `unmount` gets `el`, `tags`, `refs`, `watch` and `internals`. A page's `load` also gets `params` and `query`. See [Context](context.md).

## tags

```javascript
tags.one(selector);             // querySelector, cached
tags.all(selector);             // querySelectorAll as an array, cached
tags.each(selector, fn);        // fn(element, index) for each match
tags.has(selector);             // boolean
tags.clear();                   // drop the cache
tags.prewarmId(id);             // cache '#id'
tags.prewarm(selector, element);
```

## on

```javascript
on.click(selector, handler, options);
on[eventType](selectorOrElement, handler, options);
on[eventType].once(selectorOrElement, handler, options);
// handler(event, matchedElement); every call returns a disposer
```

| Option | Type | Description |
| ------ | ---- | ----------- |
| `signal` | AbortSignal | Default: `ctrl.signal` |
| `once` | boolean | Remove after the first match |
| `passive` | boolean | Default: `true` only for touch and wheel events |
| `capture` | boolean | Capture phase. Non-bubbling events always use it. |
| `attrs` | object | Attribute tests (`null` = must be absent) |
| `not` | string | Skip when `closest(not)` is inside the shadow root |
| `key` | string or number | Same key replaces the earlier registration |
| `scope` | `'shadow'` or `'assigned'` | `'assigned'` also matches slotted light DOM |

See [Context](context.md#on).

## watch

```javascript
watch.attr(target, names, handler, options);   // (attr, next, prev, el)
watch.kids(target, handler, options);          // ({ added, removed }, el)
watch.kids(target, { deep: true }, handler, options);
watch.children(target, handler, options);      // alias of watch.kids
watch.text(target, handler, options);          // (text, old, el)
watch.tree(target, handler, options);          // (records, target)
watch.slot(slotOrSelector, handler, options);  // ({ assigned, assignedElements }, slot)
// each kind also has .once; every call returns a disposer
```

`target` is a selector or an element inside the shadow root. Options: `{ signal, once, requirePresent }`, or an `AbortSignal`. See [Context](context.md#watch).
