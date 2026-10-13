---
title: "Platform"
order: 15
---

# Platform

The Anza platform layer detects browser capabilities, lazily loads polyfills for missing features, and provides a unified interface to modern APIs regardless of native support.

It answers two questions: what does this browser support, and how do I use the feature regardless?

## What You Get

- **Feature detection** — 30+ lazy-evaluated boolean flags for routing, components, CSS, scheduling, storage, networking, and security
- **Lazy polyfills** — automatic, on-demand loading for URLPattern, Navigation API, popover, shadow DOM, anchor positioning, and scheduler
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
| [Quick Start](quickstart.md) | Feature detection and polyfills in five minutes |
| [Supports](supports.md) | Full supports registry and detection flags |
| [Guards](guards.md) | Lazy polyfill loaders and usage patterns |
| [Scheduler](scheduler.md) | Prioritized task scheduling and yielding |
| [API Reference](api.md) | Complete API reference |
| [Troubleshooting](troubleshooting.md) | Common problems and how to fix them |

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

- New to the platform layer? Start with [Quick Start](quickstart.md).
- Want the full capability matrix? Read [Supports](supports.md).
- Need polyfills? [Guards](guards.md).
- Working with scheduler? [Scheduler](scheduler.md).
- Prefer a single reference page? [API Reference](api.md).
- Building floating UI / tooltips? [Guards: escape](guards.md#escape) and [Overlay patterns](../elements/overlay.md).
