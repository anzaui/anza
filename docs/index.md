# Welcome to Anza

Anza is a modern, zero-dependency web framework and toolchain built around Native Browser ES Modules, Web Standards Custom Elements, Declarative Shadow DOM (DSD), and high-performance Server-Templated UI (STUI).

## What You Get

| Pillar | Capability |
|---|---|
| **Zero-Bundle Runtime** | True native ESM in development and production. No heavy bundler graphs or transpilation bottlenecks. |
| **Server-Templated UI** | High-performance server rendering with multi-language engines (Rust, Python, TypeScript) and cryptographic origin signing. |
| **Declarative Shadow DOM** | Encapsulated custom element trees hydrated instantly by modern browser engines before JavaScript execution. |
| **Reactive Elements** | Lightweight, type-safe custom element factory (`element()`) with fine-grained signal observation and scoped styles. |
| **Offline-First Storage** | Integrated Service Worker cache managers, IndexedDB, and Origin Private File System (OPFS) primitives. |
| **Rust Toolchain** | Lightning-fast static site generator (`anza build`), project linter (`anza check`), and development server with instant SSE hot reload. |

## Core Principles

### 1. Web Standards First
Anza builds directly on top of the browser platform—Custom Elements, Shadow DOM, CSS Constructable Stylesheets, View Transitions, and Service Workers—without inventing proprietary component abstractions or virtual DOM overhead.

### 2. Zero-JS Progressive SSR
Server templates render standard HTML and Declarative Shadow DOM that works immediately with JavaScript disabled. Client hydration attaches seamlessly to existing DOM trees without layout shifts.

### 3. Native Monospace Wire Envelopes
Live streaming updates and soft page transitions travel as cryptographically verified JSON envelopes signed by the origin server using Ed25519 keys, verified by CDNs and edge proxies.

## Quick Example

Define a reactive custom element in pure JavaScript:

```javascript
import { element } from '@anzaui/anza/ui';

element('counter-button', {
  props: { count: { type: Number, default: 0 } },
  template: `
    <button class="btn">
      Clicked <span ref="countVal">0</span> times
    </button>
  `,
  on: {
    connect({ el, refs, on }) {
      on('click', () => {
        el.count += 1;
        refs.countVal.textContent = el.count;
      });
    }
  }
});
```

<div class="doc-pagination">
  <span></span>
  <a href="/docs/intro/install" class="doc-next-link">Next: Installation &rarr;</a>
</div>
