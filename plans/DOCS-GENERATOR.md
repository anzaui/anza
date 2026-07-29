# Docs generator (markdown → deployable `dist/`)

Planning document for **static site generation of docs from markdown** via the **toolchain**.

## Product rule (locked — hard)

**There is NO hand-maintaining a docs site tree.**

```text
docs/**/*.md  +  docs/*.toml (config)
        │
        ▼  anza docs  (toolchain)
   [ephemeral scratch OK — not committed]
        │
        ▼
     dist/     ← ONLY durable site output
```

| Humans edit | Humans do **not** edit |
| ----------- | ---------------------- |
| `docs/**/*.md` | Generated HTML under `web/src/docs` |
| `docs/config.toml` (+ optional split TOMLs under `docs/`) | A permanent Anza `src/` docs mirror |
| Asset **folders** declared in config (`styles/`, `images/`, …) | Per-file CSS lists in config |
| Frontmatter / folder conventions that improve generation | Hand-maintained docs page `index.html` / barrels as authoring |

**Reject:** “generate `web/` then humans maintain it”; “generate src then `anza build`” as the thing people edit; checked-in generated docs pages.

**Allowed:** more config files under `docs/` (e.g. `sidebar.toml`, `assets.toml`) if Rust merges them; improve MD structure (frontmatter, `index.md` folders); copy whole asset folders into `dist/`; ephemeral build scratch.

**Migration:** live `web/` stays until a later phase deletes the duplicated docs tree — it is **legacy**, not the product model.

**Related:** [NEXT.md](./NEXT.md) · [STRUCTURE.md](./STRUCTURE.md) · [SSG-SEO.md](./SSG-SEO.md) · `tasks/docs.js` · `docs/**` · `docs/config.toml` · `tools/src/docs/`

**Status:** **Phase 0–1 MVP** — `anza docs` emits test dist at `tmp/docs-site/` (not live `web/`). Full Anza `page()`/dock soft-nav still stubbed; lightweight soft-nav + static pages smokeable.

---

## Problem / motivation

Legacy pain: two parallel trees (`docs/**/*.md` vs hand-maintained `web/src/docs/**`). End state removes the second tree entirely.

**Motivation:** `docs/` (+ config) → toolchain → **`dist/`**. No intermediary docs app for humans to maintain.

---

## Current state (file pointers)

### Legacy pipeline (to retire)

```text
docs/**/*.md → tasks/docs.js → web/src/docs/... → anza build → web/dist/
```

### Target / MVP pipeline

```text
docs/**/*.md + docs/config.toml
    │
    ▼  anza docs [--out tmp/docs-site]
tmp/docs-site/  or  dist/     ← final-shaped tree only
```

| Piece | Path | Notes |
| ----- | ---- | ----- |
| Config | `docs/config.toml` | Sidebar, files, entry, **folder** assets |
| CLI | `tools/src/docs/` · `anza docs` | Dist-first generator |
| Assets | `[assets]` folder roots | Whole `styles/`, `tokens/`, `docks/`, `views/code/`, optional `images/` |
| Legacy host | `web/` | Untouched until Phase 4+ |

---

## Goals / non-goals

### Goals

1. **Authoring = markdown + docs config only** — never a hand-maintained generated docs HTML tree.
2. **Output = `dist/`** (or a test out that **is** the dist shape).
3. **Hard contract:** in-tree `.md` hrefs → site routes **without `.md`**.
4. **Assets = folders** copied wholesale; site-root `/styles/...`, `/images/...`.
5. Soft-nav / page modules in dist (Anza runtime over later phases).
6. Rust TOML under `docs/`; coexist with app `anza.json`.

### Non-goals / rejects

| Item | Why |
| ---- | --- |
| Hand-maintained HTML docs pages | Product rule |
| Permanent generated `web/src/docs` / src mirror as authoring | Product rule |
| Per-file CSS enumeration in config | Folder roots only |
| “Generate web then build” as human workflow | Product rule |
| Deleting live `web/` in MVP | Migration later |
| Bundlers / Storybook | Separate / out of scope |

---

## Architecture (locked preference)

### Dist-first (unchanged)

```text
docs/**/*.md + docs/config.toml + asset templates
        │
        ▼  anza docs  (toolchain)
   [optional ephemeral scratch — never checked in]
        │
        ▼
     dist/**          ← ONLY durable product
```

| Option | Verdict |
| ------ | ------- |
| **A. Dist-first via toolchain** | **Locked** |
| **B/C. Permanent generated src / docs-app** | **Reject as end state** |
| **D. Flat HTML only** | **Reject** — breaks soft-nav |
| **E. Content JSON runtime** | **Demoted** |

### Soft-nav without checked-in `src/`

Emit into `dist/` the same multi-file ESM graph Mode A already produces: `page()` modules, barrels, docks, `views/code`, `app.js`, Mode A HTML. Soft-nav loads from `dist/`, not from `src/`.

---

## Config: `docs/config.toml` (preferred)

### Coexistence with `anza.json`

| Manifest | Owner | Purpose |
| -------- | ----- | ------- |
| **`anza.json`** | App / STRUCTURE | Project slots: `src`, `entry`, `pages[]`, docks/views remaps, SW — any Anza app |
| **`docs/config.toml`** | Docs site build (`anza docs`) | Docs-only: which MD to include, sidebar, entry/via/out, asset paths, optional SEO hooks |

**Rationale:** STRUCTURE stays JSON (schema + JS ecosystem + existing `ssg.json`). Docs generation is a **Rust CLI concern** — TOML is idiomatic (`Cargo.toml`-style), greppable, and supports nested `[[sidebar.section]]` / `[[sidebar.section.items]]` without a second `nav.json`.

**Discovery:** `anza docs` looks for `docs/config.toml` by default (cwd or `--config`). Optional alias: repo-root `docs.toml` that only sets `root = "docs"` and points at the same file — prefer **one** file at `docs/config.toml`.

**Do not** maintain parallel `nav.json`. Sidebar lives **inside** `config.toml`.

### Sample `docs/config.toml`

```toml
# docs/config.toml — docs site manifest for `anza docs`
# App structure remains anza.json; this file is docs-site build only.

[site]
title = "Anza Documentation"
base = "/docs"                 # route prefix for MD pages
out = "dist"                   # final output dir (relative to package cwd)

[entry]
home = "index.md"              # → site.base (e.g. /docs)
route = "/docs"
landing = true                 # emit marketing `/` from asset template
shell = "index.html"           # shell template asset
root_dock = "main"
via = ["main", "docs", "content"]

[files]
# Content roots relative to this config's directory (docs/)
roots = ["."]
include = ["**/*.md"]
exclude = []

[assets]
# Folder roots only — copy whole directories into dist (never enumerate CSS files).
# Preferred once extracted:
#   pack = "../tools/assets/docs-site"   # contains styles/, tokens/, views/, images/, docks/
# Or explicit folder roots (bootstrap from current web/):
styles = "../web/src/styles"             # → dist/styles/  (site-root /styles/...)
tokens = "../web/src/tokens"             # → dist/tokens/
view_code = "../web/src/views/code"      # → dist/views/code/
docks = "../web/src/docks"               # → dist/docks/
# images = "../web/src/images"           # → dist/images/ (optional)
# landing = "../web/src/pages/entry"

[seo]
# Optional; may also read sibling/root ssg.json when present
origin = "https://example.com"
site_name = "Anza"
sitemap = true
robots = true
json_ld = true

# ── Sidebar (order = table order; hide = omit from chrome) ──────────────

[[sidebar.section]]
id = "getting-started"
title = "Getting Started"

[[sidebar.section.items]]
path = "intro/index.md"
label = "Introduction"

[[sidebar.section.items]]
path = "intro/install.md"
label = "Installation"

[[sidebar.section.items]]
path = "intro/start.md"
label = "Quick Start"

[[sidebar.section.items]]
path = "intro/build.md"
label = "Build"

[[sidebar.section.items]]
path = "intro/structure.md"
label = "Folder Structure"

[[sidebar.section]]
id = "ui"
title = "UI"

[[sidebar.section.items]]
path = "ui/index.md"
label = "Overview"

[[sidebar.section.items]]
path = "styles/index.md"
label = "Styles"

[[sidebar.section.items]]
path = "styles/tokens.md"
label = "Tokens"

# Example: keep MD in corpus / SSG but hide from sidebar
# [[sidebar.section.items]]
# path = "internal/notes.md"
# hide = true

# ── Redirects (emitted as dist stubs) ───────────────────────────────────

[[redirect]]
from = "/docs/index"
to = "/docs"

[[redirect]]
from = "/docs/ui/styles"
to = "/docs/styles/index"
```

### Config surface (normative keys)

| Section | Covers |
| ------- | ------ |
| `[site]` | Title, route `base`, `out` (`dist`) |
| `[entry]` | Home MD, docs route, landing flag, shell template, `root_dock`, `via` |
| `[files]` | Roots / include / exclude globs |
| `[assets]` | **Folder roots** (`styles`, `tokens`, `view_code`, `docks`, optional `images`) or single `pack` with those subfolders — never per-file CSS lists |
| `[seo]` | Origin, site name, sitemap/robots/json_ld hooks |
| `[[sidebar.section]]` + `[[sidebar.section.items]]` | Sections, order, labels, `hide` |
| `[[redirect]]` | Legacy path stubs |

Per-page frontmatter may still override `nav` label / `draft` / `order`; sidebar tables are the default SoT for chrome order.

### Rejected / demoted config shapes

| Shape | Verdict |
| ----- | ------- |
| `docs/nav.json` alone | **Superseded** — nest sidebar in TOML |
| Parallel `nav.toml` + `config.toml` | **Optional later** — may split under `docs/` if Rust merges; default stays one `config.toml` |
| Sidebar only in `anza.json` | **Reject** — wrong layer; keep STRUCTURE JSON for apps |
| Folder crawl as only SoT | Too weak for cross-folder groups (UI + styles) |

---

## Markdown format contract

### Page files

- **Location:** under `[files]` roots (default `docs/**/*.md`).
- **Default route:** `{site.base}/<rel-without-.md>`; special: `[entry].home` → `[entry].route` (e.g. `index.md` → `/docs`).
- **Body:** CommonMark + GFM tables (pulldown-cmark `-T -S -L -G` or Rust equivalent).

### Frontmatter (YAML, optional)

```yaml
---
title: Getting Started
description: Create a project…
route: /docs/intro/start        # rare override
tag: doc-intro-start
via: [main, docs, content]
nav: Start                      # sidebar label override
draft: false
redirect: null
style: [/styles/shared.css]
seo:
  title: Getting Started — Anza
  description: …
---
```

### Body transforms (normative)

| Markdown | Emitted |
| -------- | ------- |
| Fenced ` ```lang ` | `<view-code language="lang">…</view-code>` (aliases: `js`→`javascript`, `ts`→`typescript`, `sh`/`shell`→`bash`) |
| Bare fence | `language="text"` |
| GFM table | `<div class="table-wrap">…</div>` |
| **`.md` links** | **Site routes without `.md`** — see hard contract below |

### Markdown link rewriting — **hard contract**

Align with `tasks/docs.js` (`mdHrefToRoute` / `rewriteLinks`). The generator **must** rewrite every HTML `href` that points at an in-tree `.md` file to a **portable site route with no `.md` extension**. Failure to rewrite is a **generator bug**, not author error.

#### Rules

1. **Only rewrite targets ending in `.md`** (path part before `#`). Other hrefs (http(s), `/absolute`, `#hash-only`, `.html`, etc.) pass through unchanged.
2. **Resolve relative to the current markdown file**, then normalize `.` / `..` segments (same as Node `path` join + normalize used today).
3. **Strip `.md`**, then map to route under `[site].base` (default `/docs`):
   - Empty or bare `index` after strip → `[entry].route` (default `/docs`).
   - Otherwise → `{base}/{normalized-path-without-.md}`.
4. **Preserve fragment anchors:** `guards.md#escape` → `/docs/platform/guards#escape`.
5. **Escape hatch:** if the resolved filesystem path leaves the docs content root(s), **do not rewrite** (e.g. `../../plans/FOO.md` stays as-authored or is left alone — do not invent a `/docs` URL).
6. **Output never retains `.md` in site hrefs** for in-tree docs links. Soft-nav and hard loads use the same route strings.

#### Examples (assume file `docs/platform/guards.md`, `base = "/docs"`)

| Markdown / href | Emitted `href` |
| --------------- | -------------- |
| `[x](./supports.md)` | `/docs/platform/supports` |
| `[x](supports.md)` | `/docs/platform/supports` |
| `[x](../router/api.md)` | `/docs/router/api` |
| `[x](../foo/bar.md)` | `/docs/foo/bar` |
| `[x](./x.md#hash)` | `/docs/platform/x#hash` |
| `[x](guards.md#escape)` | `/docs/platform/guards#escape` |
| `[x](../styles/index.md)` | `/docs/styles/index` |
| `[x](../index.md)` or to docs home | `/docs` (when target is entry `index.md`) |
| `[x](/docs/intro/start)` | unchanged (already a site path) |
| `[x](https://example.com)` | unchanged |
| `[x](#local-only)` | unchanged |
| `[x](../../plans/FOO.md)` | unchanged (outside docs root) |

#### CI

`anza docs --check` should fail on:

- In-tree `.md` hrefs that would remain `.md` after emit (rewrite missed).
- Rewritten routes with no matching source page (broken link).
- Sidebar `path` entries missing on disk.

---

## What to extract / reuse from `web/` (as assets)

| Asset | Action |
| ----- | ------ |
| `styles/` (+ tokens, docks, view-code, optional images) | `[assets]` **folder roots** → copy whole dirs into `dist/` (`/styles/...`, `/images/...`) |
| `views/code/**` | → `dist/views/code/`; barrel imports it |
| `docks/docs` + `docks/content` | Templates; **sidebar filled from `[[sidebar.*]]`** |
| `pages/entry` | Landing template when `[entry].landing = true` |
| `web/src/docs/**` | **Delete** after parity |

---

## Phased plan (dist-first)

### Phase 0 — Contract + `config.toml` fixture — **DONE (MVP)**

- Dist-first + link-rewrite hard contract + `docs/config.toml` (subset sidebar).
- Folder-based `[assets]` (no per-file CSS lists).
- **Acceptance:** met for contract + config fixture.

### Phase 1 — Dist MVP — **DONE (test out)** / soft-nav partial

- `anza docs` → **`tmp/docs-site/`** (final-shaped dist; not live `web/`).
- Link rewrite, view-code, table-wrap, sidebar from TOML, whole `styles/`/`tokens/`/`docks/`/`views/code/` copy.
- Soft-nav: lightweight `app.js` fetch-swap (Anza `page()`/dock runtime **stubbed** via emitted modules).
- **Acceptance:** static serve smoke OK; full Anza soft-nav remains follow-up.

### Phase 2 — Full corpus + SEO

- All included MD → `dist/`; redirects from `[[redirect]]`; `[seo]` / `ssg.json` hooks.
- **Acceptance:** Route inventory parity; SEO titles; orphan/broken-link warnings.

### Phase 3 — Parity gate

- Compare to current `web/dist`; goldens; `anza docs --check`.
- **Acceptance:** UX parity; barrels complete; contract check green.

### Phase 4 — Remove `web/src/docs`

- Authors only: `docs/**` + `docs/config.toml` + asset pack.
- Host points at generated `dist/`.
- **Acceptance:** No checked-in docs page tree under `web/src/docs`.

### Phase 5 — Optional retire `web/` host

- Worker/wrangler + templates only; no `web/` package required to publish docs.

---

## Acceptance criteria (summary)

| Phase | Gate |
| ----- | ---- |
| 0 | **Done** — dist-first + link contract + `docs/config.toml` |
| 1 | **Done (test dist)** — `tmp/docs-site/`; rewrite / view-code / folder assets; light soft-nav |
| 2 | Full corpus + SEO + redirects |
| 3 | Parity + CI `--check` |
| 4 | No `web/src/docs`; host serves `dist/` |
| 5 | Optional: remove `web/` host |

---

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Soft-nav without src | Emit page modules + barrels into **`dist/`** |
| Intermediary app tree returns | CI gate after Phase 4 |
| Link rewrite regressions | Hard contract + `--check` on leftover `.md` hrefs |
| Two manifests confuse authors | Document: `anza.json` = app structure; `docs/config.toml` = docs site build |
| Sidebar drift | TOML `[[sidebar.*]]` SoT |
| view-code missing | Always copy `[assets].view_code` (whole folder) into dist |

---

## Implementation sketch (non-binding)

| Layer | Candidate |
| ----- | --------- |
| Config | `toml` / `serde` → `docs/config.toml` |
| MD | `pulldown_cmark` |
| Links | Port `tasks/docs.js` `rewriteLinks` / `mdHrefToRoute` into Rust |
| CLI | `anza docs` → writes **`dist/`** |
| Scratch | Optional temp → shared SSG/extract → `dist/` |

---

## Pointer from NEXT

Canonical tracker: **[DOCS-GENERATOR.md](./DOCS-GENERATOR.md)** — dist-first; Phase 0–1 MVP via `anza docs` → `tmp/docs-site/`.

---

## Decision log

| Decision | Choice |
| -------- | ------ |
| Authoring SoT | `docs/**/*.md` + **`docs/config.toml`** |
| Nav / sidebar | **`[[sidebar.section]]` / `[[sidebar.section.items]]` in config.toml** — no parallel `nav.json` |
| App vs docs manifests | **`anza.json`** = STRUCTURE/app; **`docs/config.toml`** = docs site build |
| Link rewrite | **Hard contract** — in-tree `.md` → site routes **without `.md`** (align `tasks/docs.js`) |
| Generator product | **`dist/` only** |
| Permanent `web/src/docs` | **Reject as end state** |
| Soft-nav | Page modules + barrels in **`dist/`** (MVP: light `app.js`; Anza runtime later) |
| Assets | **Whole folders** only (`styles`, `images`, …) |
| Hand-maintained docs HTML tree | **Hard reject** |
| MVP out | **`tmp/docs-site/`** (shaped like final `dist/`) — not live `web/` |
