# Mutations & Events — Precise Targeting, Absolute Control, No Leaks

Planning document for tightening Anza’s mutation observation and event-binding surfaces so attachments hit **only** intended nodes, ownership is explicit, and soft-nav / unmount cannot leave orphaned listeners or observers.

**Related:** [PHASE-II.md](./PHASE-II.md) (DSD adopt / soft-nav leaf swap) · [ELEMENTS.md](./ELEMENTS.md) (element kit docs) · [NEXT.md](./NEXT.md) · `library/src/core/ui/notes/watch.md` · `docs/ui/context.md` · `docs/events/`*

**Status:** **Complete** — Phases 0–4 delivered (engineering + acceptance checklist). Lifecycle cross-links landed where pages already exist (incl. toast). Body-portal / overlay **element docs** are not a remaining deliverable of this plan; that surface may be revisited separately (approach TBD) and does not block closing this track.

---



## Problem / motivation

Anza already has the right *shape* for lifecycle safety: component `ctrl` (`AbortController`), shadow-scoped `on` / `watch`, and `ui.observe.`* / `events.listen|delegate|once` with AbortSignal disposers. Soft-nav swaps only the page leaf while parent docks stay mounted; disconnect aborts `ctrl` and should tear down shadow-scoped bindings.

Gaps remain between “usually safe” and **absolute control**:

1. **Over-broad observation** — one selector registration forces a shared `MutationObserver` on the whole shadow root with `subtree: true`; a single `watch.attr(..., '*')` or `watch.tree` drops `attributeFilter` for *every* registration on that instance.
2. **Orphaned root listeners** — `on` leaves the shadow-root `addEventListener` attached after the last handler for that event type is disposed (until component abort).
3. **Imprecise event matching** — `on` uses `closest()` from the event start node, while `events.delegate` walks `composedPath()`. Slot / retarget / nested-shadow cases can attach logic to the wrong element or miss the intended one.
4. **Passive defaults** — `on` defaults `passive: true` for *all* event types (not only scroll-critical). `preventDefault()` silently fails unless authors pass `passive: false`.
5. **Document-wide escape hatches** — router container discovery, navigation polyfill click capture, and popover polyfill use `#main` / `document` / `document.body` observers or listeners. These are intentional but must stay rare, bounded, and disconnectable.
6. **Docs drift** — public docs mention `watch.children`; implementation is `watch.kids`. Incomplete API surface in `docs/ui/api.md` vs `watch.md` notes.
7. **Soft-nav risk surface** — leaf `replaceChildren` / `swapView` relies on `disconnectedCallback` → `ctrl.abort()`. Anything attached **without** that signal (raw `document.addEventListener`, ad-hoc `MutationObserver`, element kit code that forgets signal) survives the leaf and throttles subsequent navigations.

Performance is the product constraint: every idle soft-nav must leave **zero** listeners/observers owned by the detached leaf.

---



## Current state (file pointers)



### Component lifecycle & context


| Piece                       | Location                                                                | Behavior                                                                            |
| --------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `AbortController` bootstrap | `library/src/core/ui/base.js`                                           | `connectedCallback` creates `ctrl`; `disconnectedCallback` aborts                   |
| Define connect / unmount    | `library/src/core/ui/define/element.js`                                 | Mount builds context; unmount then `super.disconnectedCallback()` → abort           |
| Context factory             | `library/src/core/ui/define/proxy.js` → `createComponentContext`        | Creates `tags`, `refs`, `on`, `watch`; installs tags invalidation MO                |
| Soft-nav leaf swap          | `library/src/core/ui/define/orchestrator.js`, `container.js` `swapView` | New leaf via `createElement` + `swapView` / `replaceChildren`; same-tag leaf reused |




### Events


| API                | Location                                            | Scope / cleanup                                                                            |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `on.*` (delegated) | `proxy.js` → `createEventDelegator`                 | One listener per `(type, capture)` on **shadowRoot**; registry of selectors; `ctrl.signal` |
| `events.delegate`  | `library/src/core/events/delegate.js`               | Explicit root; **composedPath** match; disposer + signal                                   |
| `events.listen`    | `library/src/core/events/listen.js`                 | Direct target; passive default for touch/wheel only                                        |
| `events.once`      | `library/src/core/events/once.js`                   | Native `once` + signal                                                                     |
| `events.bus`       | `library/src/core/events/bus.js`                    | `EventTarget`; signal-aware                                                                |
| Nav polyfill click | `library/src/core/platform/polyfills/navigation.js` | **document**-level click (framework, once)                                                 |




### Mutations / observers


| API                          | Location                                         | Scope / cleanup                                                      |
| ---------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| `watch.attr                  | kids                                             | text                                                                 |
| Tags cache invalidation      | `proxy.js` → `installInvalidationHooks`          | `childList` on shadowRoot, `subtree: false`                          |
| `ui.observe.mutation` etc.   | `library/src/core/ui/observe.js`                 | Caller-chosen root; AbortSignal disconnect                           |
| Container selector discovery | `library/src/core/router/container.js`           | MO on `#main`, `subtree: true`; disconnects when all selectors found |
| Popover polyfill             | `library/src/core/platform/polyfills/popover.js` | `document.body` MO while open; disconnect on hide                    |




### Design notes / docs / tests

- Spec / intended `watch` contract: `library/src/core/ui/notes/watch.md` (authoritative for kinds, handlers, scoping).
- Public docs (aligned): `docs/ui/context.md`, `docs/ui/api.md`, `docs/ui/observers.md`, `docs/ui/advanced.md`, `docs/events/*`.
- Tests: `library/tests/core/ui/proxy.test.js`, `observe.test.js`, `soft-nav.test.js`; `library/tests/core/events/{delegate,listen,once,bus}.test.js`; `library/tests/core/platform/globals.test.js`.
- Soft-nav tests assert adopt / leaf swap **and** zero leaf-owned `on`/`watch` attachments + stable `globals.count()` after swap.



### What already works well

- Shadow default for `on` / `watch` (no accidental document observation from component helpers).
- AbortSignal as the single cleanup bus for component-owned work.
- Direct-element `watch` can observe targets with `subtree: false` when no selector regs exist (R-04).
- `attributeFilter` union when all attr watches are named (until `*` / `tree` poison it).
- Router container MO scoped to `#main`, not `document`, and self-disconnects.
- Element kit mostly passes `el.ctrl.signal` (spinner, link, pagination, toast timeout, etc.).

---



## Identified gaps & failure modes


| ID  | Failure mode                                                                  | Why it hurts                                                                               |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| G1  | Shared watch options coarsen to the union of all regs                         | One `tree` / `attr *` disables `attributeFilter`; one selector enables root-wide `subtree` |
| G2  | Empty `on` registry still keeps root listener                                 | Extra handler work every event until disconnect                                            |
| G3  | `on` matching ≠ `delegate` matching (`closest` vs `composedPath`)             | Wrong target across slots / nested shadows; hard to reason about                           |
| G4  | `passive: true` default for all `on` events                                   | Broken `preventDefault` (submit, touch, drag) unless opted out                             |
| G5  | Selector `watch` with zero current matches still observes full shadow subtree | Correct for late bind, but costly if abused as “wait forever”                              |
| G6  | No first-class slot / light-DOM watch                                         | Authors invent document or host MOs; notes say use `slotchange` but no helper              |
| G7  | `ui.observe.mutation` accepts any root + any options                          | Easy to observe `document` with `subtree: true` from app code                              |
| G8  | Soft-nav orphan risk for non-signal attachments                               | Leaf gone; listener/MO remains → INP / memory creep across navigations                     |
| G9  | Docs `watch.children` vs code `watch.kids`                                    | Absolute control requires one canonical API                                                |
| G10 | No inventory / budget for framework-global listeners                          | Nav polyfill + future globals can accumulate unnoticed                                     |
| G11 | Tags MO clears entire cache on any direct childList                           | High churn templates thrash queries (documented; still a perf footgun)                     |
| G12 | Duplicate registration possible                                               | Same selector/handler registered twice → double fire (no dedupe key)                       |


---



## Goals / non-goals



### Goals

1. **Precise targeting** — selectors, attribute filters, scope roots, shadow boundaries, and slots attach only to intended nodes.
2. **Absolute control** — clear ownership of every observer/listener; easy opt-in/out; disposers + AbortSignal as the only supported cleanup paths.
3. **No accidental globals** — document / `#main` / `body` observation is framework-owned, rare, bounded, and tested.
4. **No performance leaks** — disconnect on unmount; tear down empty root listeners; bound observer option sets; soft-nav leaves zero orphaned attachments.
5. **Fit Anza’s model** — native multi-file ESM; web components / DSD; docks stay mounted; leaf swap aborts leaf `ctrl`; no mega-bundle “event framework.”



### Non-goals


| Anti-pattern                                                    | Why                                                      |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| New reactive framework / virtual DOM diff                       | Wrong product; DOM + WC already own truth                |
| Cross-component automatic watch via selectors outside shadow    | Use events, store, or parent-owned refs (`watch.md` §13) |
| Replacing `MutationObserver` with polling                       | Worse perf and battery                                   |
| Bundling all event helpers into one mega module                 | Keep ESM entry points (`ui`, `events`, `observe`)        |
| Making every element observe light DOM by default               | Breaks encapsulation; opt-in only                        |
| Perfect parity with browser DevTools “Event Listeners” UI in v1 | Nice-to-have diagnostics later                           |


---



## Design principles

1. **Shadow-first, explicit escape** — default scope is the component shadow root. Light DOM, assigned nodes, `document`, and `#main` require explicit API knobs and (in dev) warnings when over-broad.
2. **Narrowest observe options** — prefer direct-target observe + `attributeFilter` + `subtree: false`. Shared observers may exist only when option fingerprints match; never let one registration widen another’s filter set.
3. **One ownership story** — every attachment either (a) takes `{ signal }` defaulting to `ctrl.signal`, or (b) returns a disposer that removes exactly that attachment. Framework globals are named, counted, and documented.
4. **Match path == intent** — event delegation resolves the intended node from `composedPath()` within the chosen root, then applies selector / attribute predicates.
5. **Disconnect is free; leave-behind is not** — abort must be idempotent; queued MO callbacks must no-op after abort (already partially true).
6. **Opt-in breadth** — `watch.tree`, `attr` *, `deep: true`, `subtree: true`, document roots are escape hatches with louder docs and optional dev counters.
7. **Soft-nav invariant** — after leaf swap, detached page instances hold no live listeners/observers. Parent docks may keep theirs.

---



## Proposed API / control surface

Keep existing call shapes; extend options and add a few precision helpers. Prefer additive, back-compat changes.

### A. Event delegation — `on` (component) & `events.delegate`

```javascript
// Existing
on.click('.btn', handler)
on.click('.btn', handler, { signal, once, passive, capture })

// Precision options (additive)
on.click('.btn', handler, {
  signal, once, passive, capture,
  root,           // default: shadowRoot; allow Element within shadow; rare: host
  match: 'path',  // default after change: composedPath within root (align with delegate)
  attrs: {        // optional predicate on matched element
    'data-action': 'save',   // must equal
    'aria-disabled': null    // must be absent
  },
  not: '.ignore', // skip if match.closest(not) within root
  scope: 'shadow' // 'shadow' | 'assigned' (slot-aware) — see Slot section
})

on.click.once(...)
```

**Control rules**

- Default `root` = component `shadowRoot`. Observing / listening outside requires `events.listen` / `events.delegate` with an explicit root (not silent upgrade of `on`).
- Default passive: align with `events.listen` — **passive only for** `touchstart|touchmove|wheel|mousewheel` unless overridden. (Breaking vs current `on` default — see Risks; ship behind a clear changelog note.)
- When the last registration for `(type, capture)` is removed, **remove** the root listener immediately (fix G2).
- Optional **dedupe key** `{ key: 'toolbar-save' }` — second add with same key replaces the first (absolute control over duplicates).

`events.delegate(root, selector, type, handler, options)` gains the same `attrs` / `not` / `key` options for parity.

### B. Direct listeners — `events.listen` / raw platform

No change to the happy path. Harden guidance:

```javascript
events.listen(target, type, handler, { signal: ctrl.signal, passive, once, capture })
// Prefer this over target.addEventListener when outside `on`
```

Dev-mode (optional later): warn if `target === document || target === document.body` and no `signal` was passed.

### C. Mutation watching — `watch`

Keep kinds: `attr`, `kids`, `text`, `tree` (+ `.once`). Canonical name remains `kids`; add `children` **as alias** (docs already use it) so absolute control has one implementation, two names.

```javascript
watch.attr(target, attrs, handler, {
  signal, once,
  deep: false,          // attr: N/A; documented only for kids
  requirePresent: false,// if true + selector matches nothing → warn + no-op (no full-tree wait)
  filter: attrs,        // already positional; options may refine later
})

watch.kids(target, { deep: false }, handler, options)
watch.text(target, handler, options)
watch.tree(target, handler, options) // escape hatch — prefer typed kinds

// New: slot / light boundary (opt-in)
watch.slot(slotElOrSelector, handler, options)
// handler: ({ assigned, assignedElements }, slot) => void
// Implemented via 'slotchange' + optional light MO on host only when deep light needed
```

**Observer ownership model (perf-critical)**

Replace “one observer, union of all options” with **observer buckets keyed by observe fingerprint**:

```
fingerprint = {
  root,                // shadowRoot or specific Element
  attributes, attributeFilter|*, attributeOldValue,
  childList, subtree,
  characterData, characterDataOldValue
}
```

- Registrations join the bucket whose fingerprint they need.
- A `tree` / `attr *` registration creates (or joins) a *wide* bucket — it must **not** widen a narrow bucket used by other regs.
- Direct Element targets with identical narrow options share one MO observing those targets.
- Selector targets that need late-bind observe the shadow root (or an explicit subtree root) only in a bucket that requires it.
- On last registration leave → `disconnect` that bucket’s observer.

This is the main fix for G1.

### D. Low-level `ui.observe.mutation`

Keep the escape hatch; tighten defaults and docs:

```javascript
ui.observe.mutation(root, fn, signal, {
  childList: true,      // default (unchanged)
  subtree: false,       // document this as the safe default
  attributes: false,
  attributeFilter,      // required in docs when attributes: true
})
```

Optional helper:

```javascript
ui.observe.mutation.scoped(shadowRoot, selector, fn, signal, options)
// resolves elements inside shadow only; refuses document roots in dev
```



### E. Framework-global registry (internal)

For router / navigation / polyfills only:

```javascript
// internal — not a public app API in phase 1
globals.attach(name, { type: 'listener'|'observer', target, dispose })
globals.detach(name)
globals.count() // test helper
```

Names: `router.nav-click`, `router.container-mo`, `popover.body-mo`, etc. Soft-nav and unit tests assert expected counts.

---



## Lifecycle contract

```
connect / mount
  ctrl = new AbortController()
  createComponentContext → on + watch bind to shadowRoot with defaultSignal = ctrl.signal
  tags invalidation MO tied to ctrl.signal
  spec.mount(ctx) may add more listen/observe with ctrl.signal

soft-nav (same via chain)
  parent docks: stay connected — keep on/watch/globals they own
  old leaf: disconnect → unmount hook → ctrl.abort()
    → all on registries cleared; watch buckets disconnect; tags MO disconnect
    → any listen/observe/delegate that used ctrl.signal dispose
  new leaf: fresh ctrl + fresh on/watch

full load / hard refresh
  new document; adopt DSD; same connect path; no wipe

unmount / disconnect
  abort is the source of truth; disposers are idempotent
  queued MutationObserver callbacks must check aborted before dispatch (already)
```

**Author rules (document in ui + events troubleshooting)**

1. Never `document.addEventListener` / `new MutationObserver` in `mount` without `{ signal: ctrl.signal }` or a returned disposer called from `unmount`.
2. Prefer `on` / `watch` inside components; prefer `events.*` + signal outside.
3. Do not observe `document` / `body` for component concerns — lift to parent dock or use events/store.
4. Soft-nav will not call your `unmount` if you never disconnected — don’t attach to long-lived roots from a leaf without an abort signal.

---



## Performance budget / anti-patterns



### Budget (acceptance targets)


| Metric                                                  | Target                                            |
| ------------------------------------------------------- | ------------------------------------------------- |
| Listeners owned by detached leaf after soft-nav         | **0**                                             |
| MutationObservers owned by detached leaf after soft-nav | **0**                                             |
| `on` root listeners when registry empty                 | **0** (per type/capture)                          |
| Watch buckets per component                             | O(distinct fingerprints), typically 1–3           |
| Framework globals (`globals.count`)                     | Stable documented set; no growth per navigation   |
| Default `watch.attr`                                    | `attributeFilter` set; `subtree` only if required |




### Anti-patterns (lint / docs / optional DEV warnings)


| Anti-pattern                                          | Prefer                                     |
| ----------------------------------------------------- | ------------------------------------------ |
| `watch.tree(shadowRoot)` for one attr                 | `watch.attr(ref, 'open', …)`               |
| `watch.attr(sel, '*', …)` casually                    | Named attrs list                           |
| `ui.observe.mutation(document, …, { subtree: true })` | Scoped root + filter                       |
| `on.click('*', …)` / ultra-broad selectors            | Specific class / `ref` / attr selector     |
| Per-item `addEventListener` in lists                  | `on` / `delegate`                          |
| Passive `false` on scroll handlers                    | Passive true                               |
| MO for slotted light DOM                              | `watch.slot` / `slotchange`                |
| Re-registering same handler every `update`            | Register once in `mount`; dispose on abort |


---



## Phased implementation



### Phase 0 — Inventory & contracts (docs + tests only) — **done**

**Objective:** Lock the soft-nav / abort invariant and fix API naming drift before behavior changes.

**Deliverables**

- [x] Canonical plan: this file.
- [x] Align docs: `watch.kids` primary, `children` alias noted; fix `docs/ui/api.md` / `context.md` signatures to match `watch.md` notes.
- [x] Soft-nav leak tests: after leaf swap, assert no remaining listeners/observers on detached host (via test doubles or `globals` counters + abort spies).
- [x] Document framework globals (nav click, container MO, popover MO) in `docs/events` or `docs/ui/advanced`.

**Acceptance**

1. Docs match implementation names and handler signatures.
2. Soft-nav leak test fails if leaf `ctrl.abort` is skipped or watch/on not signal-bound.
3. Phase 0 docs/tests landed; behavior changes followed in Phases 1–4.



### Phase 1 — Harden existing surfaces (no new concepts) — **done**

**Objective:** Fix known leaks and defaults without teaching a new mental model.

**Deliverables**

- [x] **G2:** `createEventDelegator` removes root listener when registry for that key is empty.
- [x] **G4:** Change `on` passive default to match `events.listen` (scroll-critical only); changelog + docs.
- [x] **G9:** `watch.children = watch.kids` alias.
- [x] Ensure abort path clears `listeners` Map *and* relies on signal removal (already); add tests for dispose-all-handlers.
- [x] Element kit audit: every `addEventListener` / `ResizeObserver` / MO uses `ctrl.signal` or disposer (textarea/chart already pattern).
- [x] Tests in `proxy.test.js` for empty-registry teardown + passive default.

**Acceptance**

1. Register `on.click`, dispose last handler → `removeEventListener` invoked (spy).
2. `on.click` without `{ passive: false }` can `preventDefault` (passive only for touch/wheel).
3. Soft-nav leak test still green; no new document observers.



### Phase 2 — Precise targeting & observer buckets — **done**

**Objective:** Absolute control over *what* is observed/matched without coarsening neighbors.

**Deliverables**

- [x] **G1:** Watch observer buckets by fingerprint; `tree` / `attr` * isolated.
- [x] **G3:** `on` matching via `composedPath` within root (shared matcher util with `events.delegate`).
- [x] Options: `attrs` predicate, `not`, optional `key` dedupe on `on` / `delegate`.
- [x] `requirePresent` for selector watches (opt-in fail-closed).
- [x] Dev warnings: selector watch with 0 matches without `requirePresent`; `attributeFilter` missing when `attributes: true` on `ui.observe.mutation`.

**Acceptance**

1. Component with `watch.attr(btn, 'disabled')` + `watch.tree(editor)` → disabled-only filter still applied on the narrow bucket (spy on `observe` options).
2. Slotted / nested-shadow event fixture: `on` and `delegate` select the same intended node (`composedPath` + shared matcher).
3. Dedupe `key` replaces prior handler (single fire).
4. Perf micro-assert: mutating unrelated attrs does not invoke narrow `watch.attr` handler when a sibling `tree` exists.



### Phase 3 — Boundaries (slots, light DOM opt-in) — **done**

**Objective:** First-class slot control so authors never reach for `document` MOs.

**Deliverables**

- [x] `watch.slot` (slotchange-based) + docs.
- [x] Optional `scope: 'assigned'` for `on` (match assigned elements through slot in path).
- [x] Explicit rejection (dev throw / prod no-op) when `watch` direct target is outside shadow (throws in `resolveTargets`).
- [x] Guidance in element docs for overlays that portal to `body` (toast): ownership stays on the portal host with signal cleanup. *(Shipped on [toast](../docs/elements/toast.md); further overlay/kit docs are out of scope for this plan.)*

**Acceptance**

1. Light-DOM child assigned to slot fires `watch.slot` / scoped `on` only when opted in.
2. Default `on`/`watch` still ignore light DOM outside assignment path.
3. Toast + framework popover polyfill documented as signal-/globals-owned, not document-long-lived app listeners.



### Phase 4 — Diagnostics & docs polish — **done**

- [x] Internal `globals` registry + test helper.
- [x] Troubleshooting pages: “orphan after soft-nav,” “passive preventDefault,” “MO thrash.”
- [x] Cross-link from [ELEMENTS.md](./ELEMENTS.md) pages that use listeners (dialog, tabs, upload, toast) to the lifecycle contract. *(ELEMENTS overview + overlay/feedback/navigation categories + dialog/tabs/upload/toast)*
- [x] Optional DEV counter: active watch buckets / on root listeners per instance (`getAttachmentStats`).

---



## Interaction with docs / elements work

- [ELEMENTS.md](./ELEMENTS.md) is docs-first and must not block this plan; when element pages document `mount` patterns, point at **signal-owned** `on` / `watch` / `events.listen`.
- Body / `#main` attachments that are framework-owned (nav polyfill, container MO, popover polyfill) stay in the `globals` registry; app toasts that portal under `body` are covered on [toast](../docs/elements/toast.md). Further body-portal / overlay kit documentation may be revisited later under a **different approach (TBD)** — not a leftover MUTATIONS deliverable.
- Hydration docs (`docs/ui/hydration.md`) note: adopt rebinds `on`/`watch` on the live shadow; soft-nav tear-down is abort of the **old** leaf only.
- Do not expand ELEMENTS scope to implement this plan.

---



## Risks / open questions

Shipped risks are closed; remaining rows are optional future exploration (no Phase 5).

| Risk / question                          | Notes                                                                                                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Passive default change is breaking       | **Shipped** — `on` matches `events.listen` (touch/wheel only); CHANGELOG + docs.                                                                           |
| composedPath matching change             | **Shipped** — shared matcher with `events.delegate`; fixtures in `proxy.test.js` / `delegate.test.js`.                                                     |
| Observer bucket complexity               | **Shipped** — fingerprint buckets in `proxy.js`; tested isolation.                                                                                         |
| Alias `children` forever?                | **Accepted** — keep `watch.children` as alias of `kids`; don’t remove `kids`.                                                                              |
| Should `on` ever allow `root: document`? | **Accepted: no** — use `events.delegate(document, …)` so document use stays greppable.                                                                     |
| Soft-nav + View Transitions              | **Mitigated** — `swapView` runs `replaceChildren` inside the VT update callback (abort on disconnect at swap time, not after animation). See `docs/ui/advanced.md`. |
| Closed shadow                            | Out of scope; Anza uses open DSD.                                                                                                                          |
| SSR / DSD                                | Watchers bind post-upgrade; no MO during pure HTML parse — OK.                                                                                             |
| Body-portal / overlay kit approach       | **Optional exploration (separate)** — not predefined element-doc pages; revisit later if product wants a different overlay model.                          |


---



## Test plan



### Unit

- `proxy.test.js` — empty `on` teardown; passive defaults; composedPath fixtures; watch bucket isolation; `children` alias; `requirePresent`; dedupe `key`; abort during queued MO callback.
- `delegate.test.js` / `listen.test.js` — attrs/`not` options; signal dispose removes listener.
- `observe.test.js` — default `subtree: false`; disposer removes abort listener (already); scoped helper rejects document in dev.



### Integration

- `soft-nav.test.js` — after N leaf swaps, framework global count stable; detached leaf has aborted ctrl and no leftover MO (instrument `MutationObserver` in test env or use bucket counters).
- Hydration adopt — `on`/`watch` bind once; no duplicate root listeners on re-entrancy.
- Container MO — still disconnects when selectors satisfied; reconnects only when new selector waited.



### Manual / perf

- Docs app: navigate 50× between element pages; Performance panel → Event Listeners on `document` / `#main` unchanged; no detached node retaining listeners.
- Stress: list with rapid childList under `watch.kids` (not `tree`); confirm handler cost stays proportional to matching records.



### Acceptance checklist (definition of done for the whole effort)

- [x] Soft-nav leaves **zero** leaf-owned listeners/observers.
- [x] No shared watch bucket widens another registration’s `attributeFilter` / `subtree`.
- [x] `on` root listeners exist iff ≥1 registration for that key.
- [x] Document/body observation only in named framework globals.
- [x] Docs + element examples teach signal ownership; `watch.children` / `kids` consistent.
- [x] CHANGELOG documents passive-default and matching behavior changes.

---



## Decision log


| Decision              | Choice                                      | Rationale                                                         |
| --------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| Canonical plan path   | `plans/MUTATIONS-EVENTS.md`                 | No prior plan covered this; keep one canonical doc                |
| Default event scope   | Shadow root only for `on`                   | Absolute control; document use stays greppable via `events.*`     |
| Watch observer model  | Buckets by fingerprint                      | Fixes coarsening without always one-MO-per-registration           |
| Slot strategy         | `slotchange` first-class; MO only if needed | Avoid document-wide light-DOM observation                         |
| Cleanup bus           | AbortSignal + disposer                      | Already Anza-wide; don’t invent a second lifecycle                |
| Implementation timing | After / parallel to ELEMENTS docs           | Docs can teach current API; engineering phases land independently |
| Body-portal kit docs  | **Not a MUTATIONS leftover**                | Toast guidance shipped; further overlay approach explored separately (TBD) |
| Plan track            | **Complete** (Phases 0–4)                   | No Phase 5; optional exploration lives in Risks only              |


---

## Closing

This track is **complete**. Do not add a Phase 5. Overlay kit docs approach is settled in [ELEMENTS.md](./ELEMENTS.md) (native top-layer + toast body-portal exception; patterns page). Optional VT edge-case hardening beyond the current `swapView` contract belongs in a new plan or ad-hoc exploration — not as unfinished MUTATIONS checkboxes.

