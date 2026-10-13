---
title: "element() factory"
order: 1
description: "The element() factory behind page, dock, view and part: spec shape, resource loading, build-time inlining, HMR, define() and BaseElement."
---

# element() factory

`element(tag, spec, base)` turns a spec object into a custom element class and registers it. `page()`, `dock()`, `view()` and `part()` translate their config into an `element()` spec, so everything on this page applies to them too.

## Signature

```javascript
import { element } from '@anzaui/anza/ui';

element(tag, spec, base);
element({ tag, ...spec }, base); // single-object form; `name` also works for the tag
```

| Argument | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `tag` | string | yes | Custom element tag. It must contain a hyphen. |
| `spec` | object | yes | Element definition (see below). |
| `base` | string | for relative files | `import.meta.url` of the calling module. |

`element()` returns nothing. When the tag is already defined it returns without a warning. Only [`define()`](#define) warns about duplicates.

## Spec shape

```javascript
element('my-widget', {
  template: '<p ref="text"></p>',     // HTML string or path to an .html file
  style: ':host { display: block; }', // CSS string, .css path, or an array of both
  eager: false,                       // true: fetch file resources at define time

  props: {
    count: { type: Number, default: 0 },
    active: { type: Boolean, state: true } // `state` needs `form: true`
  },

  mount(ctx) {},    // after the template is in the shadow root
  unmount(ctx) {},  // on disconnect
  update(ctx) {},   // once per changed prop per flush

  methods: {
    refresh() {}    // installed on the prototype; `this` is the element
  },

  form: true,       // form-associated: attaches ElementInternals
  associated(form) {},
  disabled(value) {},
  reset() {},
  restore(state, mode) {}
}, import.meta.url);
```

| Field | Description |
| ----- | ----------- |
| `template` | HTML string, or a path ending in `.html` (or starting with `./` or `/`). Only a string: the `{ html, css }` object form belongs to `page`/`dock`/`view`/`part`. |
| `style` | CSS string, path ending in `.css`, or an array mixing both. |
| `eager` | `true` starts fetching file resources when the element is defined. |
| `props` | Reactive properties. See [Props](props.md). |
| `mount`, `unmount`, `update` | Lifecycle hooks. See [Lifecycle](lifecycle.md). |
| `methods` | Prototype methods. Reserved names are skipped with a warning. |
| `form` | `true` makes the element form-associated. See [Form-associated elements](form-associated.md). |
| `associated`, `disabled`, `reset`, `restore` | Form callbacks, called with `this` = element. |

`update` runs in a microtask by default. Set `update.visual = true` to run it in the next animation frame instead. `view()` and `page()` set it for you.

## Resource loading

Inline strings compile when the element is defined. File resources work like this:

- **Lazy by default.** Nothing is fetched until the first instance connects. Defining many elements costs no requests.
- **`eager: true`** starts the fetch at define time, for an element you know renders right away.
- **Parallel.** The styles, the template and the template's `.tags.json` descriptor load in parallel.
- **Once per URL.** Concurrent loads share one request. A loaded asset is cached for every element that uses the same URL. A failed load is not cached.
- **Inlined in production.** `anza build` puts relative style and template files into the module itself, so production elements make no requests for them. See [Templates](templates.md#build-time-inlining).
- **Pre-rendered elements mount first.** An element that adopted a Declarative Shadow DOM root wires up and runs `mount` before any fetch. In a built app it does not request what the DSD already carries. See [Hydration (DSD adopt)](hydration.md).

A relative path without `base` cannot be resolved. The factory logs `[Native UI] <tag> template "./x.html" is relative but no base was given` and then treats the path as inline text. Root-absolute paths (`/styles/card.css`) resolve against the deploy base without `base`.

A file that fails to load logs `Failed to load template resource …` and the element mounts with what did load (an empty shadow root when the template is missing). Later instances of the same element reuse that result until the page reloads.

## Stylesheets

When the browser supports constructable stylesheets, each CSS file or string becomes one `CSSStyleSheet` shared by every instance through `adoptedStyleSheets`. Otherwise the CSS is added as a `<style>` element in each shadow root.

## HMR

`anza dev` injects a client that listens to the dev server and dispatches window events:

| Event | `detail` | Effect |
| ----- | -------- | ------ |
| `anza:hmr:css` | `{ path, css }` | The shared sheet of every element whose style URL matches `path` is replaced with `replaceSync(css)`. Instances keep their DOM. |
| `anza:hmr:html` | `{ path, html }` | The template is recompiled. Every live instance runs `unmount`, gets a fresh clone and runs `mount` again. |

JavaScript changes reload the page. Only file resources hot-swap; inline strings change with the module.

## Shadow DOM

Every element gets an open shadow root unless the spec sets `mode: 'closed'` (`shadow: 'closed'` in the definition layer). A closed root renders and wires like an open one; only outside code loses access, since `el.shadowRoot` is `null`. Light DOM (`shadow: false` in the definition layer) is not supported; it logs a warning and uses an open root.

## Reserved names

These names are skipped in `spec.methods`, with a warning:

- `connectedCallback`, `disconnectedCallback`, `attributeChangedCallback`
- `adoptedCallback`, `formAssociatedCallback`, `formDisabledCallback`
- `formResetCallback`, `formStateRestoreCallback`
- `mount`, `unmount`, `constructor`

Names that already exist on the element prototype are skipped too.

## define()

`define(tag, Class)` registers a class you wrote yourself. It warns and skips when the tag is already defined, and does nothing when `customElements` is missing.

```javascript
import { define } from '@anzaui/anza/ui';

class HelloBanner extends HTMLElement {}

define('hello-banner', HelloBanner);
define('hello-banner', HelloBanner); // warns: already registered, skipped
```

## BaseElement

The generated class extends `BaseElement`. You can extend it yourself for an imperative element:

- `connectedCallback` creates `this.ctrl` (an `AbortController`) and calls `this.mount()`. A rejected `mount()` promise is logged.
- `disconnectedCallback` calls `this.unmount()`, then aborts `this.ctrl`.

```javascript
import { BaseElement } from '@anzaui/anza/ui';

class ChartWidget extends BaseElement {
  mount() {
    window.addEventListener('resize', () => this.draw(), { signal: this.ctrl.signal });
    this.draw();
  }

  draw() {
    this.textContent = `${window.innerWidth}px`;
  }
}

customElements.define('chart-widget', ChartWidget);
```

## Related

- [Elements](../elements/index.md): the shipped `ui-*` elements, all built with `element()`.
- [Overlay patterns](../elements/overlay.md): popover and dialog elements.
