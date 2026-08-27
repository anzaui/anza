# Anza

Anza is a web UI toolkit for building fast web applications using standard browser features. It combines client-side custom elements, client-side routing, an offline cache layer, a Rust-based development and static build CLI, and server-side template engines for Rust, TypeScript, and Python.

## Features

- **Standard Web Components**: Declarative custom elements with reactive state, Shadow DOM, and scoped styles.
- **Client Routing**: Page and slot transitions with support for the browser View Transitions API.
- **Offline & Cache**: Service worker cache management and IndexedDB data persistence.
- **Static Generation (SSG)**: Fast HTML pre-rendering with Declarative Shadow DOM output.
- **Server Template Engines**: Render full HTML pages and JSON envelope fragments from Rust, TypeScript, and Python backends with optional HMAC/Ed25519 payload signing.

## Installation

### Project Scaffolding

```bash
npm create @adukiorg/anza my-project
cd my-project
npm install
anza dev
```

### CLI Tooling (Rust)

Install or compile the CLI binary:

```bash
cargo install --path tools
```

Or build locally:

```bash
cargo build --release --manifest-path tools/Cargo.toml
```

## CLI Usage

The `anza` command provides development, build, and validation tools:

```bash
# Start the local development server with hot module reloading
anza dev

# Verify project conventions, route definitions, and element bindings
anza check

# Build production bundle and pre-render static HTML pages
anza build

# Generate starter files for a new element, dock, or page
anza generate element my-counter
anza generate dock dashboard
anza generate page settings
```

## Client Library Usage

```html
<script type="module" src="/src/app.js"></script>

<!-- Slot containers update when routes or fragments change -->
<anza-dock name="main">
  <anza-page path="/" src="/src/pages/home/index.js"></anza-page>
  <anza-page path="/about" src="/src/pages/about/index.js"></anza-page>
</anza-dock>
```

```javascript
// src/elements/my-counter/index.js
export class MyCounter extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.count = 0;
    this.render();
  }

  increment() {
    this.count += 1;
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>button { padding: 0.5rem 1rem; cursor: pointer; }</style>
      <button>Count: ${this.count}</button>
    `;
    this.shadowRoot.querySelector('button').onclick = () => this.increment();
  }
}
customElements.define('my-counter', MyCounter);
```

## Server Engines

Server-side template rendering libraries are available in `engines/`:

- **Rust**: `engines/rust` (`anza` crate on crates.io)
- **TypeScript / JavaScript**: `engines/ts` (`anza` package on npm)
- **Python**: `engines/py` (`anza` package on PyPI)

## License

MIT © 2026 aduki, Labs
