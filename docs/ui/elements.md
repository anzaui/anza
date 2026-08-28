# Elements

The `element(tag, spec, base)` factory is the core of the Anza UI layer. It compiles a declarative spec object into a custom element class, handles resource loading, property reflection, lifecycle hooks, and memory-safe cleanup.

The higher-level `page()`, `dock()`, `view()`, and `part()` functions all delegate to `element()` internally. Understanding `element()` helps you use the definition layer more effectively.

## Signature

```javascript
element(tag, spec, base);
```

| Argument | Type | Required | Description |
| ---------- | ------ | ---------- | ------------- |
| `tag` | string | yes | Custom element tag (must contain a hyphen) |
| `spec` | object | yes | Element definition (see below) |
| `base` | string | no | `import.meta.url` of the caller |

## Spec Shape

```javascript
{
  // Template and styling
  template: string | { html: string, css: string | string[], shadow: 'open' | 'closed' },
  style: string | string[],          // inline CSS or stylesheet path(s)

  // Shadow DOM mode
  mode: 'open' | 'closed',          // default: 'open'

  // Reactive properties
  props: {
    count: { type: Number, default: 0 },
    active: { type: Boolean }
  },

  // Path parameter contract
  params: [
    { name: 'id', cast: 'number' }
  ],

  // Query param contract
  query: [
    { name: 'tab', cast: 'string' }
  ],

  // Lifecycle hooks
  mount: (ctx) => { ... },          // on connectedCallback
  unmount: (ctx) => { ... },        // on disconnectedCallback
  update: (ctx) => { ... },         // on property change

  // Custom methods installed on the prototype
  methods: {
    refresh() { ... }
  },

  // Route registration (legacy)
  url: '/path/:id',
  container: 'main',

  // Form association
  form: true,
  associated: (form) => { ... },
  disabled: (value) => { ... },
  reset: () => { ... },
  restore: (state, mode) => { ... }
}
```

## Duplicate Registration Guard

`element()` checks `customElements.get(tag)` and skips if already defined. A warning is logged in development.

## Resource Loading

Resources (templates and styles) are fetched once per registration and cached globally:

1. **Inline string** — compiled immediately, no fetch
2. **File path** — resolved against `base`, fetched once, cached in `assetCache`
3. **Tags descriptor** — a `.tags.json` file alongside `.html` is fetched for pre-warming the query cache

If a file template is given without `base`, an error is logged and the resource silently fails.

## Constructable Stylesheets

When `CSSStyleSheet` and `adoptedStyleSheets` are supported, styles are compiled into a shared constructable stylesheet and adopted by the shadow root. This avoids `<style>` injection per instance and enables HMR.

When unsupported, raw CSS text is injected as a `<style>` element in the shadow root.

## HMR (Hot Module Replacement)

During development, the factory listens for `native:hmr:css` events. When a CSS file changes, the shared stylesheet is replaced in place using `replaceSync()`. All live instances update instantly without remounting.

## Shadow DOM

Every declarative element opens a shadow root. The default mode is `open`. `closed` mode can be requested via `spec.mode`.

Light DOM (`shadow: false` in the definition layer) is not supported and falls back to `open`.

## BaseElement

The generated class extends `BaseElement`, which provides:

- `connectedCallback` — creates `AbortController`, calls `mount()`
- `disconnectedCallback` — calls `unmount()`, aborts the controller
- `this.ctrl` — `AbortController` for the element's lifetime

Subclass `BaseElement` directly for imperative custom elements:

```javascript
import { BaseElement } from '@anzaui/anza/ui';

class MyElement extends BaseElement {
  mount() {
    this.ctrl.signal.addEventListener('abort', () => {
      console.log('cleaned up');
    });
  }
}

customElements.define('my-element', MyElement);
```

## Reserved Names

These names cannot be used in `spec.methods`:

- `connectedCallback`, `disconnectedCallback`, `attributeChangedCallback`
- `adoptedCallback`, `formAssociatedCallback`, `formDisabledCallback`
- `formResetCallback`, `formStateRestoreCallback`
- `mount`, `unmount`, `constructor`

Using a reserved name logs a warning and the method is skipped.

## Related

- Shipped kit elements (ready-made `ui-*`): [Elements overview](../elements/index.md)
- Overlay architecture (native popover / dialog top-layer vs toast portal): [Overlay patterns](../elements/overlay.md)
