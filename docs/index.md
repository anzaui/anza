# Docs

Complete documentation for the Anza web platform. Everything here is a plain ES module — the browser resolves imports natively, and the Rust CLI (`anza`) copies only the files you actually use into `dist/`.

The docs are organized by how often you will need them. Start at the top and work down.

---

## Getting Started

Install the library, scaffold your first app, and understand the project layout.

| File | What It Covers |
| ------ | -------------- |
| [intro/install.md](intro/install.md) | Install `@adukiorg/anza` and the prebuilt CLI |
| [intro/start.md](intro/start.md) | Scaffold your first app with `npm create @adukiorg/anza` |
| [intro/build.md](intro/build.md) | Dev server, production build, `anza doctor` / `check` / `generate` |
| [intro/structure.md](intro/structure.md) | **Project structure contract** — required / recommended / optional slots, optional `anza.json`, service workers |

---

## Server-Templated UI (STUI) Engines

Multi-language STUI template and real-time streaming engines with Open Declarative Shadow DOM and cryptographic verification.

| File | What It Covers |
| ------ | -------------- |
| [engines/index.md](engines/index.md) | STUI architectural principles, dual-mode SSR, and overview |
| [engines/rust.md](engines/rust.md) | Rust base engine (`anza`), zero-copy parsing, Axum/Actix adapters |
| [engines/ts.md](engines/ts.md) | TypeScript/JS engine (`anza`), 0 dependencies, JIT closures, Hono/Express/Fastify |
| [engines/py.md](engines/py.md) | Python engine (`anza`), standard library implementation, FastAPI/Flask/ASGI/WSGI |
| [engines/crypto.md](engines/crypto.md) | Cryptographic verification: Asymmetric Ed25519, HMAC-SHA256, and HKDF session keys |
| [engines/streaming.md](engines/streaming.md) | Real-time Server-Sent Events (SSE) and WebSocket frame protocols |

---

## UI

The declarative custom element system. You will spend most of your time here.

| File | What It Covers |
| ------ | -------------- |
| [ui/quickstart.md](ui/quickstart.md) | Your first component in five minutes |
| [ui/elements.md](ui/elements.md) | The `element()` factory and spec shape |
| [ui/props.md](ui/props.md) | Reactive properties, types, reflection, and state |
| [ui/templates.md](ui/templates.md) | Inline, file-based, and tagged template literals |
| [styles/index.md](styles/index.md) | CSS loading, constructable stylesheets, and HMR |
| [styles/tokens.md](styles/tokens.md) | Primitive, registered, semantic tokens, transitions, and themes |
| [ui/lifecycle.md](ui/lifecycle.md) | Mount, unmount, connect, disconnect, load, change; soft-nav abort |
| [ui/context.md](ui/context.md) | `el`, `ctrl`, `tags`, `refs`, `on` (attrs/not/key/scope), `watch` (buckets/slot) |
| [ui/scheduling.md](ui/scheduling.md) | Cooperative task scheduling |
| [ui/observers.md](ui/observers.md) | Safe observer factories; `mutation.scoped` |
| [ui/transitions.md](ui/transitions.md) | Element-scoped dock VT, `ui.transition`, CSS groups, AbortSignal |
| [ui/forms.md](ui/forms.md) | Form-associated custom elements |
| [ui/hydration.md](ui/hydration.md) | Adopt open DSD from SSG / Mode B HTML |
| [ui/advanced.md](ui/advanced.md) | Internals, globals, `getAttachmentStats`, VT swap |
| [ui/api.md](ui/api.md) | Complete API reference |
| [ui/troubleshooting.md](ui/troubleshooting.md) | Common problems and how to fix them |

---

## Elements

Shipped `ui-*` custom element kit (`library/src/elements/`). Distinct from the UI `element()` factory docs.

| File | What It Covers |
| ------ | -------------- |
| [elements/index.md](elements/index.md) | Inventory, import map pattern, docs status |
| [elements/primitives.md](elements/primitives.md) | Primitive elements overview |
| [elements/forms.md](elements/forms.md) | Form controls overview |
| [elements/overlay.md](elements/overlay.md) | Overlay elements overview |
| [elements/feedback.md](elements/feedback.md) | Feedback elements overview |
| [elements/data.md](elements/data.md) | Data display overview |
| [elements/navigation.md](elements/navigation.md) | Navigation overview |
| [elements/layout.md](elements/layout.md) | Layout overview |
| [elements/button.md](elements/button.md) | `ui-button` (full) |
| [elements/icon.md](elements/icon.md) | `ui-icon` (full) |
| [elements/badge.md](elements/badge.md) | `ui-badge` (full) |
| [elements/avatar.md](elements/avatar.md) | `ui-avatar` (full) |
| [elements/divider.md](elements/divider.md) | `ui-divider` (full) |
| [elements/text.md](elements/text.md) | `ui-text` (full) |
| [elements/link.md](elements/link.md) | `ui-link` (full) |
| [elements/spinner.md](elements/spinner.md) | `ui-spinner` (full) |
| [elements/input.md](elements/input.md) | `ui-input` (full) |
| [elements/textarea.md](elements/textarea.md) | `ui-textarea` (full) |
| [elements/select.md](elements/select.md) | `ui-select` (full) |
| [elements/checkbox.md](elements/checkbox.md) | `ui-checkbox` (full) |
| [elements/radio.md](elements/radio.md) | `ui-radio` (full) |
| [elements/toggle.md](elements/toggle.md) | `ui-toggle` (full) |
| [elements/field.md](elements/field.md) | `ui-field` (full) |
| [elements/upload.md](elements/upload.md) | `ui-upload` (full) |
| [elements/form.md](elements/form.md) | `ui-form` (full) |
| [elements/dialog.md](elements/dialog.md) | `ui-dialog` (full) |
| [elements/popover.md](elements/popover.md) | `ui-popover` (full) |
| [elements/tooltip.md](elements/tooltip.md) | `ui-tooltip` (full) |
| [elements/menu.md](elements/menu.md) | `ui-menu` (full) |
| [elements/drawer.md](elements/drawer.md) | `ui-drawer` (full) |
| [elements/sheet.md](elements/sheet.md) | `ui-sheet` (full) |
| [elements/alert.md](elements/alert.md) | `ui-alert` (full) |
| [elements/toast.md](elements/toast.md) | `ui-toast` (full) |
| [elements/progress.md](elements/progress.md) | `ui-progress` (full) |
| [elements/skeleton.md](elements/skeleton.md) | `ui-skeleton` (full) |
| [elements/empty.md](elements/empty.md) | `ui-empty` (full) |
| [elements/table.md](elements/table.md) | `ui-table` (full) |
| [elements/list.md](elements/list.md) | `ui-list` (full) |
| [elements/card.md](elements/card.md) | `ui-card` (full) |
| [elements/chart.md](elements/chart.md) | `ui-chart` (full) |
| [elements/stat.md](elements/stat.md) | `ui-stat` (full) |
| [elements/nav.md](elements/nav.md) | `ui-nav` (full) |
| [elements/tabs.md](elements/tabs.md) | `ui-tabs` (full) |
| [elements/breadcrumb.md](elements/breadcrumb.md) | `ui-breadcrumb` (full) |
| [elements/pagination.md](elements/pagination.md) | `ui-pagination` (full) |
| [elements/steps.md](elements/steps.md) | `ui-steps` (full) |
| [elements/app.md](elements/app.md) | `ui-app` (full) |
| [elements/header.md](elements/header.md) | `ui-header` (full) |
| [elements/sidebar.md](elements/sidebar.md) | `ui-sidebar` (full) |
| [elements/stack.md](elements/stack.md) | `ui-stack` (full) |
| [elements/grid.md](elements/grid.md) | `ui-grid` (full) |
| [elements/split.md](elements/split.md) | `ui-split` (full) |
| [elements/scroll.md](elements/scroll.md) | `ui-scroll` (full) |
| [elements/surface.md](elements/surface.md) | `ui-surface` (full) |


---

## SSG & SEO

Contentful HTML per public route — Mode A build-time SSG, Mode B any-language templates, client DSD adopt. Phases 0–6 complete.

| File | What It Covers |
| ------ | -------------- |
| [ssg/index.md](ssg/index.md) | Overview: Mode A/B, phases 0–6, expand, origin/sitemap |
| [ssg/contract.md](ssg/contract.md) | Normative page HTML contract (head, via/DSD, site-root URLs) |
| [ui/hydration.md](ui/hydration.md) | Client adopt path after SSG / Mode B HTML paints |

---

## Router

Client-side routing with URLPattern matching, hierarchical containers, and view transitions.

| File | What It Covers |
| ------ | -------------- |
| [router/quickstart.md](router/quickstart.md) | Your first route in five minutes |
| [router/routes.md](router/routes.md) | Defining routes: patterns, params, specificity, parent chains |
| [router/handlers.md](router/handlers.md) | The six shapes a route handler can take |
| [router/guards.md](router/guards.md) | Blocking and redirecting navigation |
| [router/navigation.md](router/navigation.md) | Programmatic navigation and history |
| [router/containers.md](router/containers.md) | The container graph, via chains, and cascade mounting |
| [router/pages.md](router/pages.md) | `page()` — route-bound element definitions |
| [router/fallbacks.md](router/fallbacks.md) | Shared library 404 / 5xx / offline defaults; override ladder |
| [router/docks.md](router/docks.md) | `dock()` — container shells with swap transitions |
| [router/components.md](router/components.md) | `view()` and `part()` — stateful and stateless components |
| [router/events.md](router/events.md) | `found`, `notfound`, `error`, and `on()` subscriptions |
| [router/transitions.md](router/transitions.md) | Dock leaf VT (element-scoped) + `transitions.run` document morph |
| [router/cache.md](router/cache.md) | Prefetch and route caching |
| [router/sync.md](router/sync.md) | Cross-tab navigation synchronization |
| [router/advanced.md](router/advanced.md) | Boot gate, trie matcher, handler contract, internals |
| [router/api.md](router/api.md) | Complete API reference |
| [router/troubleshooting.md](router/troubleshooting.md) | Common problems and how to fix them |

---

## State

Reactive stores with batched updates, derived values, persistence, and cross-tab sync.

| File | What It Covers |
| ------ | -------------- |
| [state/quickstart.md](state/quickstart.md) | Your first store in five minutes |
| [state/store.md](state/store.md) | Creating and updating stores |
| [state/derived.md](state/derived.md) | Computed values that auto-update |
| [state/persist.md](state/persist.md) | `state.storage` — IndexedDB snapshots, TTL, migrations (not the tiered facade) |
| [state/sync.md](state/sync.md) | Cross-tab state synchronization via BroadcastChannel |
| [state/api.md](state/api.md) | Complete API reference |
| [state/troubleshooting.md](state/troubleshooting.md) | Common problems and how to fix them |

---

## Service Worker

Caching strategies, route interception inside the SW, background sync, and push notifications.

| File | What It Covers |
| ------ | -------------- |
| [sw/start.md](sw/start.md) | Writing your first `src/sw.js` and registering it |
| [sw/strategies.md](sw/strategies.md) | The seven caching strategies and their behavior |
| [sw/routes.md](sw/routes.md) | URLPattern routing inside the Service Worker |
| [sw/sync.md](sw/sync.md) | Background sync queue and replay |
| [sw/api.md](sw/api.md) | Complete API reference |

---

## API

Networking layer: requests, caching, streaming, uploads, and error recovery.

| File | What It Covers |
| ------ | -------------- |
| [api/quickstart.md](api/quickstart.md) | Your first request in five minutes |
| [api/requests.md](api/requests.md) | GET, POST, PUT, DELETE with typed responses |
| [api/caching.md](api/caching.md) | Request-level cache control and TTL |
| [api/streaming.md](api/streaming.md) | Server-sent events and ReadableStream handling |
| [api/uploads.md](api/uploads.md) | File uploads with progress tracking |
| [api/events.md](api/events.md) | Request lifecycle events and hooks |
| [api/errors.md](api/errors.md) | Error classification and retry strategies |
| [api/pipeline.md](api/pipeline.md) | Middleware and interceptor chains |
| [api/prefixes.md](api/prefixes.md) | Base URL and endpoint prefix management |
| [api/advanced.md](api/advanced.md) | Custom transports, adapters, and internals |
| [api/api.md](api/api.md) | Complete API reference |
| [api/troubleshooting.md](api/troubleshooting.md) | Common problems and how to fix them |

---

## Events

Event bus, delegation, namespacing, and one-shot listeners.

| File | What It Covers |
| ------ | -------------- |
| [events/quickstart.md](events/quickstart.md) | Your first event in five minutes |
| [events/listen.md](events/listen.md) | Adding and removing listeners |
| [events/bus.md](events/bus.md) | Global and namespaced event buses |
| [events/delegate.md](events/delegate.md) | Selector-based event delegation (`composedPath`, attrs/not/key) |
| [events/once.md](events/once.md) | One-shot and auto-removing listeners |
| [events/names.md](events/names.md) | Event naming conventions and namespaces |
| [events/api.md](events/api.md) | Complete API reference |
| [events/troubleshooting.md](events/troubleshooting.md) | Soft-nav orphans, passive defaults, MO thrash |

---

## Storage

IndexedDB, OPFS, LRU cache, quota management, and tiered persistence. Distinct from `state.storage` — see [storage/index.md](storage/index.md) and [state/persist.md](state/persist.md).

| File | What It Covers |
| ------ | -------------- |
| [storage/index.md](storage/index.md) | Tiered facade overview (`storage` vs `state.storage`) |
| [storage/quickstart.md](storage/quickstart.md) | Your first store in five minutes |
| [storage/idb.md](storage/idb.md) | IndexedDB wrappers and schemas |
| [storage/opfs.md](storage/opfs.md) | Origin Private File System access |
| [storage/cache.md](storage/cache.md) | In-memory and persistent caching |
| [storage/lru.md](storage/lru.md) | Least-recently-used eviction |
| [storage/tiers.md](storage/tiers.md) | Memory, IDB, and OPFS tiered storage |
| [storage/quota.md](storage/quota.md) | Storage quota estimation and cleanup |
| [storage/api.md](storage/api.md) | Complete API reference |
| [storage/troubleshooting.md](storage/troubleshooting.md) | Common problems and how to fix them |

---

## Animations

WAAPI wrappers, stagger groups, scroll-driven animations, and view transitions.

| File | What It Covers |
| ------ | -------------- |
| [animations/quickstart.md](animations/quickstart.md) | Your first animation in five minutes |
| [animations/animate.md](animations/animate.md) | The `animate()` helper and options |
| [animations/sequence.md](animations/sequence.md) | Chained and grouped animations |
| [animations/stagger.md](animations/stagger.md) | Staggered start delays |
| [animations/scroll.md](animations/scroll.md) | Scroll-driven and scroll-triggered animations |
| [animations/registry.md](animations/registry.md) | Reusable animation definitions |
| [animations/tokens.md](animations/tokens.md) | Duration, easing, and motion tokens |
| [animations/api.md](animations/api.md) | Complete API reference |
| [animations/troubleshooting.md](animations/troubleshooting.md) | Common problems and how to fix them |

---

## Workers

Web Workers: dedicated, shared, offscreen canvas, broadcast, locks, and pools.

| File | What It Covers |
| ------ | -------------- |
| [workers/quickstart.md](workers/quickstart.md) | Your first worker in five minutes |
| [workers/dedicated.md](workers/dedicated.md) | Dedicated workers and messaging |
| [workers/shared.md](workers/shared.md) | Shared workers and port management |
| [workers/offscreen.md](workers/offscreen.md) | Offscreen canvas rendering |
| [workers/broadcast.md](workers/broadcast.md) | BroadcastChannel cross-context messaging |
| [workers/locks.md](workers/locks.md) | Resource locking and coordination |
| [workers/pool.md](workers/pool.md) | Worker pools and task distribution |
| [workers/api.md](workers/api.md) | Complete API reference |
| [workers/troubleshooting.md](workers/troubleshooting.md) | Common problems and how to fix them |

---

## Security

Cryptographic helpers, sanitization, permission guards, and sealed objects.

| File | What It Covers |
| ------ | -------------- |
| [security/quickstart.md](security/quickstart.md) | Your first security check in five minutes |
| [security/crypto.md](security/crypto.md) | Hashing, signing, and SubtleCrypto wrappers |
| [security/sanitize.md](security/sanitize.md) | HTML and URL sanitization |
| [security/permissions.md](security/permissions.md) | Permission queries and gated features |
| [security/seal.md](security/seal.md) | Immutable and sealed object helpers |
| [security/api.md](security/api.md) | Complete API reference |
| [security/troubleshooting.md](security/troubleshooting.md) | Common problems and how to fix them |

---

## Platform

Feature detection, browser support matrix, scheduler, and runtime guards.

| File | What It Covers |
| ------ | -------------- |
| [platform/quickstart.md](platform/quickstart.md) | Detecting features at runtime |
| [platform/supports.md](platform/supports.md) | Feature detection helpers |
| [platform/guards.md](platform/guards.md) | Runtime feature gates, polyfills, `escapeOverflow` / `guard.escape` |
| [platform/scheduler.md](platform/scheduler.md) | Task scheduling and idle callbacks |
| [platform/api.md](platform/api.md) | Complete API reference |
| [platform/troubleshooting.md](platform/troubleshooting.md) | Common problems and how to fix them |

---

## How to Use These Docs

- **New to Anza?** Start with [intro/install.md](intro/install.md), then [intro/start.md](intro/start.md), then [ui/quickstart.md](ui/quickstart.md).
- **Building pages?** Read [router/quickstart.md](router/quickstart.md) and [router/routes.md](router/routes.md).
- **Need reactive state?** See [state/quickstart.md](state/quickstart.md).
- **Going offline?** Check [sw/start.md](sw/start.md).
- **Prefer a single reference page?** Every module has an `api.md`.
- **Stuck?** Every module has a `troubleshooting.md`.
