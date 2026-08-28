# Transitions

Soft-nav leaf swaps use **element-scoped** View Transitions on the target dock so parent chrome stays put. Document-level `transitions.run` is for explicit shared-element morphs — not the default dock path.

## Dock leaf swaps

The orchestrator calls `swapView` / `swap` on the leaf container (`dock-doccontent` for docs). That path:

1. Skips any in-flight transition on the host
2. Sets `view-transition-name` to `dock-<registryKey>` (e.g. `dock-content`)
3. Uses `host.startViewTransition` when available
4. Otherwise **direct** `replaceChildren` (never document VT — that flickers sidebar/header)

```javascript
await contentDock.swapView(pageEl, {
  direction: 'push',
  transition: { name: 'dock-content' },
  signal: leafAbort.signal
});
```

Configure at dock definition:

```javascript
dock('content', {
  parent: 'docs',
  tag: 'dock-doccontent',
  transition: true, // default; or false / { name, enabled }
});
```

## Document morph (`transitions.run`)

```javascript
import { transitions } from '@anzaui/anza/router';

await transitions.run(async () => {
  panel.replaceChildren(detail);
}, {
  sourceElement: card,
  name: 'selected-card',
  signal: ctrl.signal
});
```

Skips when unsupported, reduced-motion, disabled, or aborted. Injects a token stylesheet on first successful document VT.

Helpers: `transitions.configure`, `transitions.dockName`, `transitions.runSwap`, `transitions.prefersReducedMotion`.

## CSS

Style **named dock groups**, not `(root)`, for soft-nav:

```css
::view-transition-old(dock-content) {
  animation: 90ms ease-in both fade-out;
}
::view-transition-new(dock-content) {
  animation: var(--transition-duration) var(--transition-easing) both slide-in;
}
```

Groups: `dock-main`, `dock-docs`, `dock-content`, plus legacy `dock-swap`.

Direction is exposed as `data-transition-direction` on the host during the swap; push/pop temporarily override `--transition-easing` from `--transition-push` / `--transition-pop`.

## Reduced motion & abort

- `prefers-reduced-motion: reduce` → direct swap
- Rapid nav skips the previous host transition before starting the next
- `AbortSignal` aborts before start or calls `skipTransition` in-flight; names/easing always restored

See [UI transitions](../ui/transitions.md) for the full JS + CSS control surface and scheduling AbortSignal notes.
