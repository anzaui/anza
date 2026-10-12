---
title: "Transitions"
order: 10
description: "View transitions in the Anza UI layer: element-scoped dock swaps, transition(), runSwapTransition(), fallbacks and CSS control."
---

# Transitions

Anza wraps View Transitions (VT) for dock swaps and your own DOM updates. Dock swaps use **element-scoped** transitions, so the sidebar, header and parent docks stay out of the snapshot. When VT is missing, reduced motion is on, the call opts out or the API fails, the update still runs as a direct swap.

## Soft-nav docks (main → docs → content)

Nested docks keep chrome mounted; only the leaf dock runs `swap` / `swapView`:

```text
dock-main
  └── dock-docs          ← chrome (sidebar) stays
        └── dock-doccontent  ← leaf swap + VT group `dock-content`
              └── page-*
```

A dock's default `view-transition-name` is `dock-<name>`: `dock-main`, `dock-docs`, `dock-content`. A swap host with no dock name falls back to `dock-swap`.

```javascript
dock('content', {
  parent: 'docs',
  tag: 'dock-doccontent',
  // optional:
  transition: { name: 'dock-content' } // default already dock-content
  // transition: false                 // disable VT for this dock
});
```

Per-navigation control:

```javascript
await contentDock.swapView(pageEl, {
  direction: 'push',           // push | pop | replace → token easing
  transition: false,           // skip VT this once
  name: 'dock-content',        // override view-transition-name
  signal: ctrl.signal          // abort → skipTransition, clear names
});
```

## Library API

```javascript
import {
  ui,
  transition,
  runSwapTransition,
  configureTransitions,
  prefersReducedMotion
} from '@anzaui/anza/ui';

// Global opt-out / custom naming
ui.configureTransitions({
  enabled: true,
  nameFor(el, { dockName, name }) {
    return name ?? (dockName ? `dock-${dockName}` : 'dock-swap');
  }
});

// Ad-hoc document morph (shared-element optional)
const tx = await ui.transition(() => {
  panel.replaceChildren(next);
}, {
  sourceElement: card,
  sourceName: 'selected-card',
  signal: ctrl.signal
});
await tx.finished;

// Same helper docks use (element-scoped only — never document for docks)
await ui.runSwapTransition(host, () => host.replaceChildren(leaf), {
  dockName: 'content',
  direction: 'push',
  signal: ctrl.signal
});
```

Router helper (document morph + token sheet inject):

```javascript
import { transitions } from '@anzaui/anza/router';

await transitions.run(() => panel.replaceChildren(next), {
  sourceElement: thumb,
  name: 'hero-image',
  signal: ctrl.signal
});
```

## Fallback behaviour

| Condition | Behaviour |
| --------- | --------- |
| No `Element.startViewTransition` (dock swap) | Direct `replaceChildren` |
| No `document.startViewTransition` (document `transition()`) | Direct update |
| `prefers-reduced-motion: reduce` | Direct update |
| `transition: false` / `configureTransitions({ enabled: false })` | Direct update |
| VT throws / aborts | Direct update (or skip); names + easing restored |
| `AbortSignal` aborted | Before start: rejects with `AbortError`. In flight: `skipTransition()` |

`replaceChildren` still runs inside the VT **update callback** when VT is used — leaf `ctrl.abort()` happens at swap time, not after the animation finishes.

## CSS control

```css
/* Target the leaf dock group — not (root) */
::view-transition-old(dock-content) {
  animation: 90ms ease-in both fade-out;
}
::view-transition-new(dock-content) {
  animation: var(--transition-duration) var(--transition-easing) both slide-in;
}

/* Directional hint on the host during swap */
dock-doccontent[data-transition-direction="pop"] {
  /* optional host styling */
}
```

Tokens:

| Token | Purpose |
| ----- | ------- |
| `--transition-duration` | VT length |
| `--transition-easing` | Active curve (push/pop temporarily override) |
| `--transition-push` / `--transition-pop` / `--transition-replace` | Directional easing |
| `--transition-offset` | Default slide distance |
| `--transition-bg` | Snapshot backdrop |

Reduced motion zeros duration and disables the default keyframes via `@media (prefers-reduced-motion: reduce)`.

## Scheduling (AbortSignal)

Soft-nav tears down leaf work via `ctrl.abort()`. Pass the signal into schedule helpers so pending work does not run on a detached tree:

```javascript
await ui.schedule(() => indexChunk(), {
  priority: ui.Priority.VISIBLE,
  signal: ctrl.signal
});

await ui.scheduleFrame(() => measure(), { signal: ctrl.signal });
await ui.yield({ signal: ctrl.signal });
```

Already-aborted signals reject with `AbortError` immediately.

## Platform flags

```javascript
import { supports } from '@anzaui/anza/platform';

supports.viewTransitions;         // document.startViewTransition
supports.elementViewTransitions;  // Element.prototype.startViewTransition
```
