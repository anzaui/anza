# View Transitions

**Status (2026-07-28):** Implemented — element-scoped dock VT + direct fallback, CSS named groups, lib control API, schedule AbortSignal.

**Related:** [MUTATIONS-EVENTS.md](./MUTATIONS-EVENTS.md) (soft-nav abort at swap time) · [NEXT.md](./NEXT.md) · `docs/ui/transitions.md` · `docs/router/transitions.md`

---

## Goal

Proper View Transitions for **dock / base / main** (and nested leaf docks) with a safe **fallback**, controllable via **CSS + Anza API**, and **UI scheduling** that respects soft-nav `AbortSignal`.

## Contract

| Surface | Behaviour |
| ------- | --------- |
| Dock `swap` / `swapView` | Element-scoped VT when `host.startViewTransition` exists; else direct `replaceChildren`. **Never** document VT for docks. |
| Default CSS name | `dock-<registryKey>` (`main` → `dock-main`, content → `dock-content`) |
| Opt-out | `dock(..., { transition: false })`, `swapView(..., { transition: false })`, `configureTransitions({ enabled: false })`, reduced-motion |
| Failure | Catch VT errors → direct swap; clear `viewTransitionName` + restore easing |
| Abort | `signal` before start → `AbortError`; in-flight → `skipTransition` |
| Document morph | `ui.transition` / `router.transitions.run` with optional shared-element `sourceElement` |
| Schedule | `schedule` / `scheduleFrame` / `yield` accept `{ signal }` |

## Nested docks

```text
main → docs → content (dock-doccontent)
```

Soft-nav swaps the page leaf inside the deepest dock only. Parent chrome is outside the element-scoped snapshot.

## Files

- `library/src/core/ui/transitions.js` — core API
- `library/src/core/ui/defs/dock.js` / `define/container.js` — wired swap
- `library/src/core/ui/schedule.js` — AbortSignal
- `library/src/core/router/transitions.js` — document helper + token sheet
- `library/src/tokens/semantic/transitions.css` (+ web copy)
- Tests: `library/tests/core/ui/transitions.test.js`, `library/tests/core/router/transitions.test.js`

## Non-goals

- Polyfilling element-scoped VT on older browsers (fallback is enough)
- Animating `(root)` for soft-nav leaf swaps
- Large web docs HTML rewrites (markdown + token CSS are source of truth)
