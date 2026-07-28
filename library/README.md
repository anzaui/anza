# @adukiorg/anza

> The browser already knows how to render, route, cache, and animate. We just stopped getting in its way.

[![npm](https://img.shields.io/npm/v/@adukiorg/anza)](https://www.npmjs.com/package/@adukiorg/anza)
[![license](https://img.shields.io/npm/l/@adukiorg/anza)](./LICENSE)
[![tests](https://img.shields.io/badge/tests-237%20passing-brightgreen)](#testing)

---

## What This Is (and What It Is Not)

**This is** a web platform library that treats the browser as the runtime. It gives you reactive state, client-side routing, custom elements, offline sync, and animations — all as plain ES modules the browser resolves directly. No bundler. No virtual DOM. No framework lock-in.

**This is NOT** another React competitor. React is excellent for complex applications with rich ecosystems. Anza is for projects that prefer browser-native APIs and minimal tooling. We're not trying to replace React — we're offering a different approach.

**This is NOT** Angular. Angular provides a comprehensive framework with powerful tooling. Anza focuses on simplicity: `element('my-button', { template: '<button>Click me</button>' })`. That's the whole API.

**This is NOT** Vue. Vue's template compiler and virtual DOM enable great developer experiences. Anza uses native HTML parsing — the browser handles the DOM directly, which works well for many use cases.

---

## The Pitch

Anza is built on browser-native APIs. Every module wraps something the browser already ships:

| Module | What it wraps | What we did to it |
| --- | --- | --- |
| `/api` | `fetch`, Streams API, `scheduler.postTask` | Added retries, caching, and a pipeline. The browser did the hard part. |
| `/state` | ES Proxy, `queueMicrotask`, `BroadcastChannel` | Reactive stores with batched updates. No getters/setters boilerplate. |
| `/events` | `CustomEvent`, `AbortSignal` | Pub/sub with cleanup that actually works. |
| `/router` | Navigation API, History API, `URLPattern` | Routes that match URLs and render views. Shocking, we know. |
| `/storage` | IndexedDB, Cache API, OPFS | Tiered persistence: memory → IDB → disk. You pick the tier. |
| `/offline` | `navigator.onLine`, IndexedDB | Queue failed requests, replay them later. Like a polite retry system. |
| `/animations` | WAAPI (`element.animate`) | Stagger groups and scroll-driven animations. The GPU does the work. |
| `/workers` | Web Locks API, Web Workers | A worker pool with concurrency limits. Because tabs deserve boundaries. |
| `/security` | Web Crypto API, `DOMParser` | Encrypt, hash, sanitize. The browser has a crypto lab. We use it. |
| `/platform` | 30+ browser APIs | Feature detection so you know what you are working with. |
| `/ui` | Custom Elements, Shadow DOM, CSS Layers | Declarative components with reactive props and lifecycle hooks. No classes. |
| `/sw` | Service Worker, Cache API, Background Sync | Caching strategies, route interception, and push notifications. |
| `/theme` | `data-theme`, `localStorage`, `matchMedia` | Auto theme switching with persistence. Light, dark, or high-contrast. |

The Rust CLI (`anza`) resolves your ESM import graph and copies only the modules you actually use into `dist/`. It generates type declarations, serves with HMR, and gets out of your way.

---

## Quick Start

```bash
npm create @adukiorg/anza myapp
cd myapp
npm install
npm run dev
```

That is it. Your browser loads `dist/app.js` natively. No webpack. No vite. No `npm run build` that takes forty seconds — our Rust CLI compiles your app in milliseconds.

---

## What You Actually Write

### A Component

```javascript
import { view } from '@adukiorg/anza/defs';

view('user-card', {
  props: {
    name: { type: String, default: 'Guest' },
    active: { type: Boolean }
  },
  template: `
    <div class="card">
      <h2 ref="title">{{ name }}</h2>
      <span class="badge" hidden="">{{ active }}</span>
    </div>
  `,
  on: {
    connect({ refs }) {
      refs.title.textContent = this.name;
    },
    change({ name, val, refs }) {
      if (name === 'name') refs.title.textContent = val;
    }
  }
});
```

Use it:

```html
<user-card name="Alice" active></user-card>
```

No complex build pipeline. No JSX transform. No virtual DOM reconciliation. The browser parses the template, creates the DOM, and updates it when props change. Because that is literally what browsers are for.

### A Route

```javascript
import { page, dock } from '@adukiorg/anza/defs';

dock('main');

page('/', {
  tag: 'page-home',
  via: ['main'],
  template: { html: './home.html', css: './home.css' }
}, import.meta.url);
```

Click `<a href="/about">`. The router intercepts it. The view transitions. No full page reload. The Navigation API has been in Chrome since 2022. We use it.

### Reactive State

```javascript
import { state } from '@adukiorg/anza/state';

const store = state.create({ count: 0 });

store.subscribe('count', () => {
  console.log('count changed to', store.get('count'));
});

store.set('count', 1);
```

Proxy-based reactivity. Batched updates. Cross-tab sync via `BroadcastChannel`. No reducers. No actions. No sagas. Just a store that notifies subscribers when data changes.

### Theme Switching (Automatic)

```javascript
import { theme } from '@adukiorg/anza/theme';

theme.toggle();              // light ↔ dark
theme.set('high-contrast');  // high-contrast mode
theme.resolved();            // effective theme (resolves auto)
```

No init call needed. It auto-restores from `localStorage` (`anza-theme`) on import. Sets `data-theme` on `<html>`. Respects `prefers-color-scheme` if no saved preference exists. Attaches to `window.theme` for devtools access.

---

## The Token System

Anza ships with a complete design token layer:

- **Primitives** — OKLCH color scales, spacing, motion, radius, shadow, z-index
- **Semantic** — light, dark, high-contrast themes with GPU-accelerated token morphing
- **Components** — form controls, feedback, overlays, layout tokens
- **Transitions** — View Transition timing and backdrop tokens

You own `src/tokens/` after scaffolding. Change a primitive, every component updates. Change a semantic mapping, the whole theme shifts. Override anything in `@layer overrides`. The cascade handles the rest.

---

## Philosophy

**Native first.** If the browser has an API for it, we use it. If it doesn't, we build the smallest possible wrapper. We do not reimplement the browser inside JavaScript.

**Instant builds.** The browser resolves ESM imports natively. Our Rust CLI copies the files you use into `dist/` in milliseconds. That is the whole build step. No bundling. No tree-shaking algorithms. The browser is single-threaded anyway.

**You own your code.** Scaffolding copies starter files into `src/`. The library never touches them again. No hidden configs. No magic globals. No runtime injection of framework internals.

---

## Testing

Tests run in **real Chromium** via `@web/test-runner` — no jsdom, no node mocks, no pretend browser.

```bash
npm test
```

If it passes in Chromium, it passes in Chrome. If it passes in Chrome, it probably works everywhere else. (We said probably. Safari is Safari.)

---

## License

[MIT](./LICENSE) © 2026 Aduki
