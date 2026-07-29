# Project Structure Contract

Planning document for a **consistent-but-flexible** Anza app layout that humans learn once and the **Rust CLI can validate**.

**Related:** [NEXT.md](./NEXT.md) · [STORAGE-STATE-GUARDS-PAGES.md](./STORAGE-STATE-GUARDS-PAGES.md) · [SSG-SEO.md](./SSG-SEO.md) · `docs/intro/structure.md` · `docs/intro/start.md` · `docs/ssg/contract.md` · `tools/src/create/**` · `tools/src/main.rs` (`doctor`) · `tools/src/build/entries.rs` · `tools/src/extract/runner.rs`

**Status:** **Complete** through Phase 5 (spec + scaffold + import-order + doctor/check + via/dock + DX + `anza generate`).

---

## Problem

Today Anza teaches a scaffold tree (`docs/intro/structure.md`, `anza create`) but **does not enforce it**:

| Surface | What it does today | Gap |
| ------- | ------------------ | --- |
| `anza create` | Writes a fixed tree (`src/app.js`, `pages/`, empty `docks/`/`views/`/`parts/`, tokens/styles copy) | Opinionated start — good |
| Build / extract | Walks **all** `src/**/*.js` for `page`/`dock`/`view`/`part`; import-graph copies reachable ESM | Correct for multi-file ESM — but any layout “works” if imports resolve |
| `anza doctor` | Soft existence checks; still looks for `src/index.js`, `src/core/`, treats `src/elements/` as primary | **Stale** vs scaffold (`app.js`); no required/optional contract |
| Docs site (`web/`) | Uses `src/pages/` **and** `src/docs/` (~197 page folders) + `src/docks/` | Proves “pages must live only under `pages/`” is too rigid |
| Config | Optional JSON siblings: `ssg.json`, `ssg.params.json`, `importmap.json` | No project-structure manifest |

**Adoptability cost:** every greenfield team invents a slightly different tree; doctor lies; newcomers cannot tell required vs decorative folders. **Flexibility cost of over-constraining:** forbidding `src/docs/` (or similar domain trees) would fight the product’s own site and multi-file ESM barrels.

We need a **directory contract with optional slots** — Cargo/Nest-style defaults + remaps — not an Angular mega-`angular.json` workspace.

---

## Goals

1. One greppable, machine-readable **structure contract** the Rust CLI validates.
2. Clear **required vs optional** slots (shell, entry, root dock, pages, docks, views, parts, tokens, styles, SW, SSG config, fallbacks-by-reference).
3. **Opinionated defaults** matching `anza create`; **documented escape hatches** (extra page trees, remapped roots, inline templates).
4. Improve `doctor` / add `check` without forcing a bundler or monorepo framework.
5. Teach the contract in intro docs the same way SSG teaches `docs/ssg/contract.md`.

### Non-goals

- Implementing the full validator in this planning pass (tiny stub OK later; prefer plan first).
- Angular/Nest-scale workspace / schematic generators (can come later as `anza generate`).
- Mandating every page under `src/pages/` only.
- Copying per-dock `404.html` into folders (fallbacks stay **by reference** — see [STORAGE-STATE-GUARDS-PAGES.md](./STORAGE-STATE-GUARDS-PAGES.md)).
- Replacing `ssg.json` in phase 0 (may merge later under one manifest).
- Bundlers ([issue #2](https://github.com/aduki-org/anza/issues/2)).

---

## Industry patterns (what fits Anza)

| Pattern | Useful idea | Fit for Anza |
| ------- | ----------- | ------------ |
| **Cargo.toml** | Convention (`src/lib.rs`) + optional manifest keys; workspace later | Strong — “defaults work with zero config” |
| **Nest `nest-cli.json`** | `sourceRoot` / `entryFile` remaps; JSON Schema | Strong — remap without new trees |
| **Angular `angular.json`** | Per-project roots, schematics | Too heavy — skip workspace graph |
| **Biome `$schema`** | Published JSON Schema for editor + CI | Strong — ship `structure` schema next to package |
| **package.json `exports`** | Required shape + optional extra keys | Analog: required slots + optional trees |
| **OpenAPI / JSON Schema** | Required vs optional properties; `$ref` | Use for the **manifest**, not for every HTML file |
| **SSG contract (existing)** | Normative HTML shape + goldens + check script | Mirror process for **folder** contract |
| **Directory contracts / optional slots** | Required spine; optional modules | Exact product need |

**Reject as primary model:** convention-only (status quo — too soft); mega-framework workspace JSON; inventing a new layout language per app.

---

## Executive recommendation

### Format choice

**Convention defaults + optional `anza.json` + published JSON Schema.**

| Choice | Verdict |
| ------ | ------- |
| **Convention-only** | Reject as sole approach — doctor already proves soft checks do not teach or gate |
| **`structure.json` alone** | OK but splits identity from future CLI settings |
| **`anza.toml`** | Attractive for Rust CLI; deferred — no `toml` dep today; JS ecosystem + existing `ssg.json` are JSON; revisit if CLI settings grow large |
| **`anza.json` + schema** | **Preferred** — matches `ssg.json` / `importmap.json`, `serde_json` already in tools, `$schema` for editors, greppable |

**Default:** apps need **no** `anza.json`. Scaffold and docs teach the default tree. Presence of `anza.json` only when remapping roots or declaring extra page trees for tooling.

**Schema:** published at `library/schemas/anza.schema.json`, exported as `@adukiorg/anza/schemas/anza.schema.json`:

```json
{
  "$schema": "./node_modules/@adukiorg/anza/schemas/anza.schema.json"
}
```

Rust validates via a **serde struct** that mirrors the schema (same pattern as `ssg.json` loading) — do not require a full JSON Schema runtime in the CLI for v1.

### Optional merge path (later)

Once stable, optionally fold `ssg` into `anza.json`:

```json
{
  "$schema": "...",
  "src": "src",
  "entry": "app.js",
  "ssg": { "origin": "https://example.com" }
}
```

Keep reading root `ssg.json` for compatibility until a deprecation window.

---

## Normative default tree

### Required (hard fail on `anza check` / doctor `--strict`)

```text
<project>/
  package.json          # "type": "module"; scripts may call anza
  src/
    index.html          # shell: importmap + tokens/styles links + module entry
    app.js              # (or configured entry) — registers root dock + imports barrels
```

**Semantic required (validated after extract / light parse), not merely path existence:**

1. **Entry reachable** from the shell’s `<script type="module">` (or configured entry).
2. **At least one** `page(...)` registration in the reachable graph.
3. **Root dock** — default name `main` (or `anza.json` `rootDock`) registered via `dock(...)` before pages that `via` it.
4. Shell references **site-root** asset URLs (`/app.js`, `/tokens/...`, `/styles/...`) — align with [docs/ssg/contract.md](../docs/ssg/contract.md) portability rules.

### Recommended (scaffold creates; warn if missing)

| Slot | Path | Notes |
| ---- | ---- | ----- |
| Pages barrel | `src/pages/index.js` | Imports page folders; not the only allowed page tree |
| Landing page | `src/pages/<name>/` with `index.js` (+ optional `.html`/`.css`) | Scaffold uses `entry/` |
| Tokens | `src/tokens/` | Copied at create; owned by app |
| Styles | `src/styles/` | Copied at create; owned by app |
| Service Worker | `src/sw.js` | Optional product-wise; recommended for offline story — see [Service workers](#service-workers-anzajson) |
| Import map stub | `importmap.json` | Empty `{}` ok; merged at build |

### Optional slots (may be absent; if present, validate lightly)

| Slot | Default path | Rules |
| ---- | ------------ | ----- |
| Docks | `src/docks/` | Barrel + one folder (or file) per dock; **no** required `404.html` / error HTML files |
| Views | `src/views/` | **Global** reusable stateful components (optional slot + remap). Co-location under docks/user folders is organization only — tags stay global. **Not** a per-dock CE registry. |
| Parts | `src/parts/` | Stateless primitives |
| Extra page trees | e.g. `src/docs/` | Allowed when imported from entry/barrels; declare in `anza.json` `pages[]` for tooling hints |
| Legacy elements | `src/elements/` | Warn if coexist with `pages` — migrate to view/part/page |
| SSG config | `ssg.json` / `ssg.params.json` | Existing contracts |
| Fallbacks | *by reference* | `dock`/`page` `{ notfound\|error\|offline: { tag } }` or library built-ins — **not** folder slots |

### Explicitly not required

- `src/core/` (library concern; doctor must stop warning apps for missing it)
- Per-route folders named exactly like URLs
- `src/index.js` (scaffold uses `app.js`; keep as documented legacy fallback in entry discovery only)
- Empty placeholder dirs that apps never use (scaffold may still create empty `docks`/`views`/`parts` **with `index.js` barrels** for discoverability — optional in check)

### Index-per-folder convention

Each **meaningful** folder under `views`, `docks`, `pages`, and user trees should expose an **`index`** barrel (`index.js`, plus leaf `index.html` / `index.css` when applicable). Scaffold writes barrels for `pages/`, `docks/`, `views/`, and `parts/`. Phase 2 doctor/check should expect this convention.

### Import order (build tooling)

User source may import in **any** order. Rust build (`tools/src/build/order.rs`) rewrites static `import` / `export … from` in emitted `dist/` JS into **usage order**: library → docks → views → parts → pages (incl. `docs/`) → other. Mid-file static imports are hoisted. No bundling — ESM semantics preserved. Developers must not rely on source order.

### Escape hatches (`anza.json`)

```json
{
  "$schema": "./node_modules/@adukiorg/anza/schemas/anza.schema.json",
  "src": "src",
  "entry": "app.js",
  "shell": "index.html",
  "rootDock": "main",
  "pages": ["pages", "docs"],
  "docks": "docks",
  "views": "views",
  "parts": "parts",
  "tokens": "tokens",
  "styles": "styles",
  "sw": "sw.js"
}
```

All path values are relative to `src` except project-root files (`importmap.json`, `ssg.json`). Omit keys to keep defaults. Extra unknown keys: warn in strict mode, ignore in loose mode (forward-compat).

`sw` accepts a **string** (single entry, scaffold back-compat) or an **array** of paths / `{ path, scope }` objects — see below.

---

## Service workers (`anza.json`)

### Platform constraints (why this shape)

Native multi-file apps do **not** get “many service workers for modularity” the way they get many ESM page files:

| Fact | Implication for Anza |
| ---- | -------------------- |
| **One registration per scope**; most-specific matching scope wins for a client | Multiple SWs only when scopes differ (e.g. `/` vs `/admin/`). Overlapping scopes are a footgun — warn. |
| Script URL directory caps default max scope (unless host sends `Service-Worker-Allowed`) | Putting the site-wide SW under `src/sw/main.js` → emit path `/sw/main.js` defaults scope to `/sw/`, **not** `/`. Root-scoped SW should stay at site root (`/sw.js`) unless the host widens scope. |
| Modularity inside **one** controlling SW | Use **ESM imports** from the entry (`import './sw/routes.js'`) — same multi-file graph as the app. Classic `importScripts` is legacy; scaffold already registers `{ type: 'module' }`. |
| Today’s toolchain | `entries.rs` seeds only `src/sw.js`; `sw.rs` rewrites bare specifiers only in `dist/sw.js`. Multi-entry needs an explicit list for build + doctor. |

**Do not** treat every file under a folder as a separate service worker. That fights the platform and would break the scaffold’s `/sw.js` → scope `/` story.

### Recommendation: **both** — convention + optional explicit list

| Approach | Verdict |
| -------- | ------- |
| **Array-only** (always declare `sw: [...]`) | Reject as sole model — zero-config scaffold must work with no `anza.json` |
| **Folders-only** (auto-register every `src/sw/**/*.js` or `src/workers/*`) | Reject — conflates modules with registrations; wrong default scopes; invisible footguns |
| **Convention + optional `sw` list** | **Preferred** — same pattern as `pages[]` |

### Normative defaults

| Slot | Path | Role |
| ---- | ---- | ---- |
| **Primary entry (recommended)** | `src/sw.js` | Single controlling SW; scaffold + docs; build entry when no `anza.json` `sw` key |
| **Shared SW modules (optional)** | `src/sw/` | **Not** auto-registered. Helpers imported by `sw.js` (or by declared entries). File `sw.js` + directory `sw/` coexist. |
| **`src/workers/`** | — | **Do not** standardize — conflates Web Workers / worklets; Anza vocabulary is already `sw` |

Apps need **no** `anza.json` for the common case. Presence of `sw` only when remapping the entry, declaring **additional scoped** workers, or pointing tooling at a non-default path.

### Schema shape

Normalize internally to `Vec<SwEntry { path, scope: Option<String> }>`.

**Shorthand (back-compat with scaffold / current plan):**

```json
{ "sw": "sw.js" }
```

Equivalent to `[{ "path": "sw.js" }]`.

**Array form (multi-SW or remaps):**

```json
{
  "sw": [
    "sw.js",
    { "path": "admin/sw.js", "scope": "/admin/" }
  ]
}
```

| Form | Meaning |
| ---- | ------- |
| `string` | One entry path relative to `src`; scope omitted → browser default (directory of script URL) |
| `string[]` | Multiple entry paths; each scope omitted |
| `{ "path": string, "scope"?: string }[]` | Mixed; `scope` is the **registration** scope the app should use in `navigator.serviceWorker.register(url, { scope })` — documented for humans + future generators; doctor does not execute register |
| Mix of strings and objects in one array | Allowed |

**Not in v1 schema:** `Service-Worker-Allowed` headers, push/sync options, or inventing a second entry filename (`service-worker.js`). Host headers stay deploy concern.

### Required vs optional / doctor & check

| Situation | Severity |
| --------- | -------- |
| No `sw` key, `src/sw.js` missing | **warn** (recommended offline story) — same as today; not hard-required |
| No `sw` key, `src/sw.js` present | **info** / ok — default entry; build must keep discovering it |
| `sw` declared (string or array) | Each `path` **must exist** under `src` → **error** if missing |
| Duplicate `path` in list | **error** |
| Duplicate `scope` (after normalizing trailing `/`) among entries that set `scope` | **error** |
| Two entries with omitted scope that would collide at same emit URL / default scope | **error** if same path; **warn** if distinct paths both defaulting to overlapping scopes when inferable |
| Overlapping but non-identical scopes (e.g. `/` and `/admin/`) | **info** or soft **warn** — nested scopes are valid; most-specific wins |
| `src/sw/` present without any SW entry | **info** — modules-only folder is fine; do not warn as “missing SW” if `sw.js` or declared entries exist |
| `src/sw/*.js` files that are **not** listed and **not** imported from a declared entry | Out of scope for v1 graph check (same as unused app modules); optional later |

`anza check` / `doctor --strict`: promote the recommended-missing-SW warn only if product policy later chooses; default stays warn-nonzero-only-in-strict for recommended slots.

### Escape hatch: single `src/sw.js`

Unchanged for greenfield and existing apps:

1. Omit `anza.json`, or omit `sw` → tooling looks for `src/sw.js`.
2. `"sw": "sw.js"` → explicit single entry (same file).
3. Do **not** require migrating to `src/sw/index.js` or an array of one.

Scaffold continues to write `src/sw.js` + `register('/sw.js', { type: 'module' })`.

### Build implications (future — not this planning pass)

When implementing (STRUCTURE Phase 2+ / build follow-up):

1. `entries::collect` seeds **all** normalized `sw` paths (default `sw.js` if key absent and file exists).
2. `sw::rewrite_imports` runs per emitted SW entry, not only `dist/sw.js`.
3. Registration remains **app code** (`app.js`); manifest `scope` is advisory unless/until `anza generate` emits register calls.

### Teaching note

Intro / SW docs keep leading with **one** `src/sw.js`. Multi-SW is an advanced escape hatch for distinct URL prefixes (admin island, docs subdomain-path, etc.), not for splitting cache strategies — use `src/sw/` modules + `router().register(...)` inside the one controlling worker instead.

---

## How Rust validates

### Layers

```text
1. Manifest     load anza.json if present → merge over defaults (serde); normalize sw string|array
2. Filesystem   required paths exist; optional slots shape-check if present; declared sw paths exist
3. Shell        parse index.html: module script + critical CSS hrefs
4. Graph/entry  reuse entries::collect + import reachability (existing; extend for multi-sw)
5. Definitions  reuse extract: page/dock/view/part counts; via → dock name set
6. Policy       legacy elements coexist; missing tokens/styles/SW; undeclared extra trees (hint); sw scope dupes
```

### Severity

| Level | When | Exit |
| ----- | ---- | ---- |
| **error** | Missing required path; no entry; no `page()`; `via` names with no matching `dock()`; shell module src missing | non-zero (`check` / `doctor --strict` / optional `build --check`) |
| **warn** | Missing recommended tokens/styles/SW; undeclared extra page tree; legacy `elements/`+`pages/`; doctor soft mode | zero unless `--strict` promotes |
| **info** | Optional slot present and well-formed | zero |

### CLI surface (phased)

1. Fix **`anza doctor`** to implement the contract (replace stale `index.js` / `core` checks).
2. Add **`anza check`** as alias or strict doctor for CI (`anza check && anza build`).
3. Optionally gate **`anza build --check`** (structure only, no full emit) — nice-to-have.

### Implementation sketch (future)

```text
tools/src/structure/
  mod.rs          // public check(project) -> Report
  defaults.rs     // DefaultPaths
  manifest.rs     // AnzaManifest serde
  fs.rs           // slot existence
  semantic.rs     // dock/page via consistency using extract specs
```

Reuse `extract::runner` specs and `build::entries` — do not re-parse the world twice in one process when called from build.

### Tiny stub (only if free)

A `structure` module that returns `Ok` when `src/app.js` + `src/index.html` exist is acceptable as a placeholder; prefer documenting acceptance tests before expanding rules.

---

## Docs teaching plan

| Doc | Change |
| --- | ------ |
| `docs/intro/structure.md` | **Done (Phase 0–5)** — SoT + generate CLI |
| `docs/intro/start.md` | **Done (Phase 0–1)** — scaffold table + barrels + import-order note |
| `docs/intro/index.md` | **Done (Phase 2–5)** — points at structure SoT + generate |
| `docs/intro/build.md` | **Done (Phase 2–5)** — diagnostics + CI + generate |
| `docs/router/docks.md` / `fallbacks.md` | **Done (Phase 0)** — docks folder optional; fallbacks not filesystem slots |
| `docs/ssg/contract.md` | **Done (Phase 0)** — sibling metaphor: HTML contract vs folder contract |
| Web docs route | **Done (Phase 5)** — regenerated; view-code/table-wrap preserved |

Tone: **one spine, many leaves** — same story as hierarchical docks.

---

## Phases

### Phase 0 — Spec freeze (docs + this plan)

**Status:** **Done** (2026-07-29).

- [x] Agree format: optional `anza.json` + convention defaults + JSON Schema (not TOML-first)
- [x] Agree required / recommended / optional tables above
- [x] Agree `src/docs/`-style extra trees are first-class via barrels + optional `pages[]`
- [x] Agree fallbacks remain reference-based (no `404.html` slot)
- [x] Agree SW shape: convention `src/sw.js` + optional `sw` string|array (`path` + optional `scope`); `src/sw/` = modules only, not auto-registered multi-SW
- [x] Publish frozen schema at `library/schemas/anza.schema.json` (exported as `@adukiorg/anza/schemas/anza.schema.json`)
- [x] Teach contract in `docs/intro/structure.md` (+ start/index cross-links; docks/fallbacks/ssg siblings)

**Acceptance:** tables reviewed; NEXT.md points here; schema frozen; intro structure doc normative — **met**. No doctor/check implementation (Phase 2).

### Phase 1 — Schema + scaffold alignment

**Status:** **Done** (2026-07-29).

- [x] Add `schemas/anza.schema.json` (or under `package/`) describing manifest keys — including `sw` as string | array of (string | `{ path, scope? }`) *(shipped in Phase 0; views/index descriptions tightened in Phase 1)*
- [x] Align `tools/src/create/run.rs` (+ JS create bins) with normative tree comments, index barrels, `importmap.json`, no `anza.json` emit, no legacy empty `elements/`
- [x] Stop treating empty optional dirs as semantically required in docs *(Phase 0 structure doc)*
- [x] Optionally emit a commented `anza.json.example` in create output **or** omit file entirely — **omit** (zero config)
- [x] Document `src/sw/` as optional SW **modules** folder (not a multi-SW discovery root) *(docs in Phase 0)*
- [x] Lock views model: single optional global `src/views/` + remap; co-location = organization only
- [x] Document index-per-folder convention (scaffold + structure docs + schema descriptions)
- [x] Import-order rewrite in Rust build (`build/order.rs` wired from `graph.rs`); unit tests

**Acceptance:** schema validates the example manifest (incl. string + array `sw` forms); create output matches required spine + index barrels; docs structure page updated; import-order tests pass — **met**.

**Deferred to Phase 2:** `anza doctor` / `anza check` enforcing index barrels and reading `anza.json` remaps for slot classification during order rewrite (Phase 1 uses default slot names).

### Phase 2 — Doctor / check (Rust)

**Status:** **Done** (2026-07-29).

- [x] Implement `tools/src/structure` with defaults + optional manifest
- [x] Rewrite `run_doctor` against the contract (remove false `src/core` / `src/index.js` required vibes)
- [x] `anza check` → strict report for CI
- [x] Normalize `sw` string|array; validate paths exist when declared; warn if default `sw.js` missing; error on duplicate path/scope
- [x] Warn / check index-per-folder convention on present slots (views, docks, pages, user trees)
- [x] Feed `anza.json` remaps into import-order classification (extend Phase 1 defaults)
- [x] Unit tests: temp dirs for missing entry, missing page, good scaffold, `web/`-like extra `docs/` tree, multi-`sw` list
- [x] Docs for doctor/check; `web/anza.json` with `pages: ["pages","docs"]`

**Acceptance:** `anza check` fails on empty `src/`; passes on fresh create; passes on `web/` with `pages: ["pages","docs"]`; warns on legacy elements coexist; accepts `"sw": "sw.js"` and multi-entry `sw` arrays — **met**.

**Deferred to Phase 3:** ~~`via` → dock consistency; warn if no `rootDock` registration.~~ **Done in Phase 3.**

### Phase 3 — Semantic via/dock consistency

**Status:** **Done** (2026-07-29).

- [x] After extract-style scan, error if any page `via` name has no dock registration
- [x] Warn if no `rootDock` registration
- [x] Do not require docks to live under `src/docks/` if `dock()` appears in `app.js` (scaffold style)
- [x] Wire into `anza doctor` / `anza check`; unit + smoke tests; docs

**Acceptance:** intentional mis-`via` fails check; bare `dock('main')` in `app.js` still passes — **met**.

### Phase 4 — Docs + DX polish

**Status:** **Done** (2026-07-29).

- [x] Intro structure page = single source of truth; doctor messages link to it
- [x] Troubleshooting: “moved pages out of `src/pages`” → declare `pages[]` or ensure barrel import
- [x] Optional: IDE snippet / schema association in package `exports` (`vscode-json-schemas.json`, `anza.code-snippets`)
- [x] CI snippet in intro/structure + intro/build docs

**Acceptance:** new contributor can answer “what must exist?” from one doc; CI snippet in intro/build docs — **met**.

### Phase 5 — Optional generators (demand-driven)

**Status:** **Done** (2026-07-29).

- [x] `anza generate page|dock|view|part` writing into declared slots
- [x] Respects `anza.json` remaps; index barrels; no `404.html` for docks
- [x] Thin filesystem helpers only — not a Nest schematic platform
- [x] Docs + unit tests

**Acceptance:** generate respects `anza.json` remaps — **met**.

---

## Relationship to other tracks

| Track | Interaction |
| ----- | ----------- |
| [STORAGE-STATE-GUARDS-PAGES.md](./STORAGE-STATE-GUARDS-PAGES.md) | Fallbacks are **not** structure slots; structure docs must not teach per-dock `404.html` |
| [SSG-SEO.md](./SSG-SEO.md) | Folder contract complements HTML contract; `ssg.json` stays sibling until optional merge |
| Bundlers #2 | Deferred — structure validation must work on multi-file ESM as-is |
| ELEMENTS | Unrelated product docs track |

**Sequencing vs storage track:** Structure is tooling/DX; storage/guards/pages is product runtime. They can proceed in parallel. Prefer shipping storage track product work first if engineering time is scarce; structure Phase 0–1 (spec + docs) is cheap and unblocks clearer teaching immediately.

---

## Open questions

1. **Manifest filename:** `anza.json` vs keep structure-only `structure.json`? → Recommend `anza.json` for future CLI settings; structure keys live at top level or under `"structure": { ... }`. Prefer flat top-level for v1 simplicity unless SSG merge lands same PR.
2. **Auto-detect extra page trees vs require `pages[]`?** → Recommend: check never errors solely for undeclared trees; **warn** if `page()` files exist outside default `pages/` and are not listed (nudge without blocking `web/`).
3. **Is `src/sw.js` recommended or optional?** → Recommend **recommended/warn** (offline is a product pillar) but not hard-required (static marketing sites).
4. **Multiple service workers: array vs folders vs both?** → **Both (convention + explicit list).** Default `src/sw.js`; optional `anza.json` `sw` as string or array of paths/`{ path, scope }`; optional `src/sw/` for **modules** imported by entries — **not** auto-discovered as separate registrations. Reject folder-only multi-SW. See [Service workers](#service-workers-anzajson).
5. **Promote warnings to build failures?** → Default: only `anza check` / `doctor --strict` fail; `anza build` stays graph-correctness only until adoptability proves otherwise.
6. **TOML later?** → Only if CLI config grows past ~JSON comfort; keep schema dual-published if so.
7. **Monorepo / multiple apps?** → Out of scope v1; single `src` root like today.
8. **Should create stop making empty `docks`/`views`/`parts`?** → Product preference: keep empty dirs **with `index.js` barrels** as teaching affordances; check treats them optional.
9. **Views: global slot vs dock-scoped CE registry?** → **Global slot + remap** (recommended). Co-location allowed as organization only.

---

## Decision log

| Date | Decision |
| ---- | -------- |
| 2026-07-29 | Prefer **convention + optional `anza.json` + JSON Schema**; not TOML-first; not convention-only; not Angular workspace |
| 2026-07-29 | Extra page trees (e.g. `src/docs/`) are blessed; declare via barrels + optional `pages[]` |
| 2026-07-29 | Fallbacks stay reference/built-in — not filesystem required slots |
| 2026-07-29 | Plan only — validator implementation deferred to Phase 2 |
| 2026-07-29 | **SW:** convention `src/sw.js` + optional `sw` string\|array (`{ path, scope? }`); `src/sw/` = shared modules only; no `src/workers/` standard; multi-SW only for distinct scopes — not for modularity (use ESM imports) |
| 2026-07-29 | **Phase 0 done** — schema frozen at `library/schemas/anza.schema.json`; `docs/intro/structure.md` normative; open questions 1–4 treated as decided recommendations |
| 2026-07-29 | **Views model locked (recommended 1):** single optional global `src/views/` + remap; co-location under docks/user trees = organization only; **not** a dock-scoped CE registry |
| 2026-07-29 | **Index-per-folder:** each meaningful folder under views/docks/pages/user trees exposes an `index` barrel — scaffold + future doctor expect it |
| 2026-07-29 | **Import order:** user may import any order; Rust build rewrites `dist/` into usage order (library → docks → views → parts → pages → other) |
| 2026-07-29 | **Phase 1 done** — scaffold aligned; schema descriptions updated; import-order rewrite + tests; doctor/check still Phase 2 |
| 2026-07-29 | **Phase 2 done** — `tools/src/structure`; `anza doctor` / `anza check`; SW validation; index barrels; remaps → import-order; `web/anza.json` |
| 2026-07-29 | **Phase 3 done** — via → dock consistency + rootDock warn; dock() in app.js accepted; wired into doctor/check |
| 2026-07-29 | **Phase 4 done** — structure SoT + troubleshooting; doctor findings → docs/intro/structure.md; CI snippet; schema IDE exports |
| 2026-07-29 | **Phase 5 done** — `anza generate page\|dock\|view\|part`; remaps + barrels; STRUCTURE track complete |
