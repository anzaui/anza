---
title: "Lifecycle"
order: 4
description: "Lifecycle of Anza UI elements: load, connect, change and disconnect hooks, their order, the anza:ready event, soft-nav abort and memory safety."
---

# Lifecycle

An element runs four hooks. In `page()`, `dock()`, `view()` and `part()` they live under `on`. Each hook is called with `this` set to the element and a context object as its argument. See [Context](context.md) for the fields.

## Hook map

| Definition layer | `element()` spec | When it runs |
| ---------------- | ---------------- | ------------ |
| `on.load` | inside `mount` | After the template is in the shadow root, before `connect`. Awaited. |
| `on.connect` | inside `mount` | After `load` resolves. |
| `on.change` | `update` | After a prop changes. See [Update batching](props.md#update-batching). |
| `on.disconnect` | `unmount` | When the element leaves the DOM, before `ctrl` aborts. |

Other functions under `on` are installed as element methods, so a hook can call `this.render()`.

## Order

For an element created on the client:

1. **Constructor.** Attaches the shadow root (open unless `mode: 'closed'`), or keeps one that already exists (see [Hydration (DSD adopt)](hydration.md)). Attaches `ElementInternals` when `form: true` or a prop has `state: true`. Reads props from attributes.
2. **Connect.** Creates `ctrl`, a fresh `AbortController`. Writes reflected prop values to absent attributes and applies the initial `:state()` set (see [Props](props.md#initial-values)).
3. **Resources.** Waits for the template and styles. Files load on the first connect of the first instance; inline strings are ready already.
4. **Render.** Clones the template into an empty shadow root and applies the styles. If the document is still parsing, it waits one task first.
5. **Wire.** Builds `refs`, `tags`, `on` and `watch`.
6. **`load`**, then **`connect`**. When both have settled (resolved or rejected), the element dispatches [`anza:ready`](#anzaready).
7. **`change`**, for each later prop change.
8. **Disconnect.** Runs `disconnect`, then aborts `ctrl`.

An element that disconnects while its resources are loading stops after step 3. It never wires or mounts.

Moving an element in the DOM disconnects and connects it again: a new `ctrl`, a new context, another `anza:ready`, and `load` and `connect` run again. The shadow root keeps its content.

An element that adopted pre-rendered Declarative Shadow DOM runs steps 5 and 6 before step 3. See [Hydration (DSD adopt)](hydration.md).

## load

Use `load` for the first data fetch. Pass `ctrl.signal` so the request is cancelled when the element disconnects:

```javascript
import { page } from '@anzaui/anza/defs';

page('/members/:handle', {
  tag: 'page-member',
  via: ['main'],
  template: '<h1 ref="name"></h1>',
  params: [{ name: 'handle', type: String }],
  on: {
    async load({ params, refs, ctrl }) {
      const res = await fetch(`/api/members/${params.handle}`, { signal: ctrl.signal });
      const member = await res.json();
      refs.name.textContent = member.name;
    }
  }
});
```

On a `page()`, the `load` context also has `params` and `query`. See [Context](context.md#params).

`connect` waits for `load`. If `load` throws or rejects, the error is logged as `[Native UI] mount failed:` and `connect` does not run.

## connect

Bind listeners and render the first state:

```javascript
const hooks = {
  connect({ el, refs, on, watch }) {
    refs.title.textContent = el.name;
    on.click('.toggle', () => {
      el.active = !el.active;
    });
    watch.text('.counter', (text) => console.log(text));
  }
};
```

`on` and `watch` registrations, and anything bound to `ctrl.signal`, are removed when the element disconnects.

## change

Runs once per changed prop per flush:

```javascript
const hooks = {
  change({ name, val, old, el, refs }) {
    if (name === 'name') refs.title.textContent = val;
    if (name === 'active') el.classList.toggle('active', val);
  }
};
```

| Field | Description |
| ----- | ----------- |
| `name` | The prop that changed |
| `val` | The new value |
| `old` | The value before the last assignment |
| `prev` | Same as `old` |
| `el`, `ctrl`, `tags`, `on`, `refs`, `watch` | As in `connect` |
| `internals` | `ElementInternals` when `form: true`, else `undefined` |

`change` does not run for initial values, for values set before the element mounted, or in a `part()`. Timing (frame or microtask) is on [Props](props.md#update-batching).

## disconnect

```javascript
const hooks = {
  disconnect({ el }) {
    console.log('removed', el.localName);
  }
};
```

The `disconnect` context has `el`, `tags`, `refs`, `watch` and `internals`. It has no `ctrl` or `on`. `ctrl` aborts right after the hook returns.

## anza:ready

Every element made by the factory dispatches `anza:ready` on itself each time it connects, once its context is wired and `load` and `connect` (the factory's `mount`) have settled. It is not dispatched if the element disconnects first.

| Property | Value |
| -------- | ----- |
| Target | The element |
| `bubbles` / `composed` | `false` / `false` |
| `detail` | `null` |

It does not fire again when a hydration mismatch re-renders the element, or when HMR swaps its template. The router waits for it on the new page after a soft navigation and then hides the loading indicator, so the indicator stays until `load` and `connect` finish.

```javascript
const card = document.createElement('user-card');
card.addEventListener('anza:ready', () => console.log('wired'), { once: true });
document.body.append(card);
```

## Memory safety

Each connect creates an `AbortController` (`ctrl`), and each disconnect aborts it. Abort removes:

- every `on` and `watch` registration;
- the observer that keeps the `tags` cache fresh;
- anything you passed `ctrl.signal` to: `events.listen`, `events.delegate`, `observe.*`, `schedule`, `fetch`, `addEventListener`.

Rules for component code:

1. Never call `document.addEventListener` or `new MutationObserver` in a hook without `{ signal: ctrl.signal }` or a matching cleanup in `disconnect`.
2. Inside a component, prefer `on` and `watch`. Outside, use `events.*` with a signal.
3. Do not observe `document` or `body` for a leaf concern. Move it to a parent dock, or use events or the store.

### Soft navigation

A soft navigation replaces only the page leaf. Parent docks stay mounted.

```text
soft-nav within the same via chain
  parent docks: keep their on / watch / listeners
  old leaf: disconnect → ctrl.abort()
    → on and watch registrations removed, tags observer disconnected
    → listeners and observers bound to ctrl.signal removed
  new leaf: new ctrl, new on / watch

hard refresh
  new document; leaves adopt their pre-rendered shadow roots
```

When a dock uses an element-scoped View Transition, `replaceChildren` runs inside the transition's update callback. The old leaf disconnects and aborts at swap time, not after the animation.

### Framework globals

A few listeners and observers belong to the framework, not to a component. They stay stable across soft navigations:

| Name | Source | Target | Lifetime |
| ---- | ------ | ------ | -------- |
| `router.nav-click` | `platform/polyfills/navigation.js` | `document` click | Page lifetime |
| `router.nav-popstate` | `platform/polyfills/navigation.js` | `window` popstate | Page lifetime |
| `router.container-mo` | `router/container.js` | `#main` mutation observer | Until the awaited containers appear |
| `popover.target-click` | `platform/polyfills/popover.js` | `document` click | Page lifetime, when the polyfill installs |
| `popover.body-mo:*` | `platform/polyfills/popover.js` | Popover parent or `body` | Until the popover hides |

List them with `globals` from `@anzaui/anza/platform`:

```javascript
import { globals } from '@anzaui/anza/platform';

console.log(globals.count(), globals.list());
```

### Attachment stats

`getAttachmentStats(shadowRoot)` counts the live `on` and `watch` attachments of one element. Use it in tests to check that a soft navigation leaves nothing behind:

```javascript
import { getAttachmentStats } from '@anzaui/anza/ui';

const el = document.querySelector('user-card');
const stats = getAttachmentStats(el.shadowRoot);
// { onRootListeners, onRegistrations, watchBuckets, watchRegistrations, slotListeners }
```

It returns `null` for a shadow root that was never wired. After the element disconnects, every count is `0`.

For overlay elements (native top layer, toast portal, popover polyfill), see [Overlay patterns](../elements/overlay.md).
