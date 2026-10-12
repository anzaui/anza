# FREEZE — spec freeze for the cleanup

Frozen from **2026-10-12** until Phase 5 in [PHASES.md](./PHASES.md) is done.
Purpose: stop the ground moving while the docs, types and tooling are made
to agree with the code.

## 1. What "frozen" means

- **No new features.** No new elements, subpaths, CLI commands, engine features or config keys.
- **No renames** of anything in §3 unless the rename is listed in §4 (decided changes).
- **Allowed:** bug fixes, performance work that keeps behaviour, deletions listed in [SWEEP.md](./SWEEP.md), docs and types that make things agree with the frozen surface.
- **Exception process:** add a row to §4 with reason and date *before* writing the code.

## 2. Version line

- Everything stays at **0.5.x** during the cleanup. Cleanup PRs land as `0.5.1`, `0.5.2`, …
- The end of the cleanup ships as **0.6.0**, the first release with a frozen, documented, typed surface.
- One version for all published packages (library, create, CLI, three engines), checked in CI (H9).

## 3. Frozen public surface

### 3.1 npm `@anzaui/anza` — subpaths

The `exports` map in `library/package.json` **is** the public API. Anything not reachable through it is internal, even if a doc imports it.

```
.            ./api        ./state      ./events     ./router
./storage    ./offline    ./animations ./workers    ./security
./platform   ./ui         ./defs       ./theme      ./sw
./elements   ./elements/<46 names>     ./styles/*   ./tokens/*
./schemas/*  ./bin/create ./package.json
```

- **Root `.`** = flat re-export (matches `src/index.js` today). Types are changed to match the runtime, not the other way round (D6).
- Deep paths like `@anzaui/anza/router/match` are **not** public (D5). Docs must not use them.

### 3.2 Symbols that need a decision (D5)

Each must be either **exported** (and typed and documented) or **removed from the docs**. Recommendations:

| Symbol(s) | Module | Recommendation |
|-----------|--------|----------------|
| `gate`, `ready`, `reset` | router | **Export.** Real app-level needs (boot gating, tests). |
| `boot` | router | Keep internal. Fix the docs. |
| `isCallback`, `resolveTag`, `runCallback`, `get` | router | Keep internal. Fix the docs (`get` → `getContainer`). |
| `seal`, `unseal` | security | **Export.** Documented as the main crypto helpers. |
| `quota`, `CacheStorage` | storage | Export `quota`. Keep `CacheStorage` internal (it shadows the global name). |
| `listenStream` | ui | Doesn't exist. Remove from the docs. |
| `specRegistry` | ui | Keep internal. Fix the docs. |

### 3.3 Tag and naming conventions

| Kind | Convention | Example |
|------|-----------|---------|
| Built-in elements | `ui-*` | `ui-button`, `ui-card` |
| Docks | `dock-<name>` | `dock-main` |
| App shells | `app-*` | `app-shell` |
| **Never** | `anza-*` tags | (README and old changelog only, D1) |

Authoring model: `element()` / `view()` / `part()` / `dock()` / `page()`. No class-based authoring in docs.

### 3.4 CLI `anza`

```
anza scan | build | dev | doctor | check | create <name>
anza generate <page|dock|view|part> <name>
anza docs [--out] [--all]
```

Run as `npx anza …` / `npm run …` in docs (it is a local devDependency).

### 3.5 Project layout contract

As written by `library/bin/create/run.js` and enforced by `anza check`:
`src/{docks,pages,views,parts}`, `anza.json`, entry page `src/pages/entry/`.
`src/elements/` stays a legacy slot (warning), not taught in docs.

### 3.6 Engines wire format

The JSON envelope (`slot`, `ts`, `html`, `sig`, `css`) and HMAC/Ed25519 signing are frozen across Rust/TS/Py. No engine-specific fields.

## 4. Decided changes (allowed despite the freeze)

| Date | Change | Reason | Audit |
|------|--------|--------|-------|
| 2026-10-12 | Rename CLI crate `anza` → `anza-cli` (`tools/`). Binary name stays `anza`. Engine crate keeps `anza`. | Both crates were named `anza`, so they can't both be published. | D11 |
| 2026-10-12 | Production build emits minified, content-hashed chunks per core / route group / element (Rolldown JS API) | Performance, no API change | P1–P5 |
| 2026-10-12 | Service worker not registered in dev | Root cause of stale reloads | R1 |
| 2026-10-12 | Default element resource loading becomes lazy, then inlined at build | Performance, no API change | P1–P3 |
| 2026-10-12 | Root `index.d.ts` switches to flat exports | Match runtime | D6 |
| 2026-10-12 | Rust engine: `SignMode::SessionBound`, `publish_meta`, `adapters::tower` deprecated in 0.5.x and **removed in 0.6.0** | They are public but do nothing. Session-bound signing needs a browser verifier the library lacks; it may come back later as a real feature. | E4 |

## 5. Out of scope during the freeze

External bundler support (#2), Mode B language packages, new elements, new engine adapters.
