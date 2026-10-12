# Welcome to Anza

Anza is a web library and toolchain built on browser standards: ES modules, custom elements, Declarative Shadow DOM, and service workers. It also ships server template engines (STUI) for Rust, Python and TypeScript.

## What You Get

| Part | What it does |
|---|---|
| **Plain ES modules** | Source is plain JavaScript, HTML and CSS. `anza dev` serves it unbundled. `anza build` bundles it into hashed chunks with Rolldown when it is installed. |
| **Custom elements** | `element()`, `view()`, `part()`, `dock()` and `page()` define custom elements with props, templates, scoped styles and lifecycle hooks. |
| **Router** | Client-side routing with nested docks, guards and fallbacks. |
| **Static HTML** | `anza build` pre-renders public routes with Declarative Shadow DOM, titles, descriptions, Open Graph tags, JSON-LD and a sitemap. |
| **Server templates** | Engines for Rust, Python and TypeScript render HTML fragments and can sign them (HMAC or Ed25519). |
| **Offline** | Service worker caching strategies, background sync, IndexedDB and OPFS helpers. |
| **CLI** | `anza dev` (dev server with live reload), `anza build`, `anza check` (project structure check) and `anza generate`. |

## Core Principles

### 1. Web standards first

Anza uses the platform directly: custom elements, Shadow DOM, constructable stylesheets, view transitions and service workers. There is no virtual DOM.

### 2. HTML first

Pre-rendered pages and server templates are standard HTML with Declarative Shadow DOM, so content shows before JavaScript runs. The client adopts the existing shadow roots instead of rendering them again ([Hydration (DSD adopt)](ui/hydration.md)).

### 3. Signed fragments

Server engines can sign the fragments they send for live updates and soft navigation, so the client can check where they came from ([Engines](engines/index.md)).

## Quick Example

A custom element with one reactive prop:

```javascript
import { view } from '@anzaui/anza/defs';

view('click-counter', {
  props: { count: 0 },
  template: '<button type="button">Clicked <span ref="count">0</span> times</button>',
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

```html
<click-counter count="3"></click-counter>
```

Next: [Getting Started](intro/index.md).

<div class="doc-pagination">
  <span></span>
  <a href="/docs/intro/install" class="doc-next-link">Next: Installation &rarr;</a>
</div>
