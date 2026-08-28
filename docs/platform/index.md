# Platform

The Anza platform layer detects browser capabilities, lazily loads polyfills for missing features, and provides a unified interface to modern APIs regardless of native support.

It answers two questions: what does this browser support, and how do I use the feature regardless?

## What You Get

- **Feature detection** — 30+ lazy-evaluated boolean flags for routing, components, CSS, scheduling, storage, networking, and security
- **Lazy polyfills** — automatic, on-demand loading for URLPattern, Navigation API, popover, shadow DOM, anchor positioning, scheduler, and sanitizer
- **Overflow escape** — `guard.escape` / `escapeOverflow` for in-tree floating UI (used by `ui-tooltip`)
- **Framework globals registry** — `globals` for soft-nav–stable platform listeners / observers
- **Runtime guards** — `typeGuard` for early-fail checks in critical paths
- **Reset for testing** — `reset(flag)` to clear cached detection values

## Package

```javascript
import {
  supports,
  guard,
  reset,
  typeGuard,
  globals,
  escapeOverflow
} from '@anzaui/anza/platform';
```

## File Map

| File | What It Covers |
| ----- | --------------- |
| [quickstart.md](quickstart.md) | Feature detection and polyfills in five minutes |
| [supports.md](supports.md) | Full supports registry and detection flags |
| [guards.md](guards.md) | Lazy polyfill loaders and usage patterns |
| [scheduler.md](scheduler.md) | Prioritized task scheduling and yielding |
| [api.md](api.md) | Complete API reference |
| [troubleshooting.md](troubleshooting.md) | Common problems and how to fix them |

## One-File Example

```javascript
import { supports, guard, typeGuard } from '@anzaui/anza/platform';

// Detect
if (supports.viewTransitions) {
  document.startViewTransition(() => updateDOM());
} else {
  updateDOM();
}

// Guard — throws if OPFS is unavailable
typeGuard('opfs', 'File storage requires Origin Private File System');

// Lazy polyfill
const URLPattern = await guard.urlPattern();
const pattern = new URLPattern({ pathname: '/user/:id' });
```

## Next Steps

- New to the platform layer? Start with [quickstart.md](quickstart.md).
- Want the full capability matrix? Read [supports.md](supports.md).
- Need polyfills? [guards.md](guards.md).
- Working with scheduler? [scheduler.md](scheduler.md).
- Prefer a single reference page? [api.md](api.md).
- Building floating UI / tooltips? [guards.md#escape](guards.md#escape) and [Overlay patterns](../elements/overlay.md).
