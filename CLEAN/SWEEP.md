# SWEEP — what to remove, merge or untrack

Goal: a **minimal, clear** repo where every top-level folder has one job and
no generated output or stale copies are in git.

Run this as **Phase 0** in [PHASES.md](./PHASES.md). Every item lists how to
check it is safe before deleting.

## Target layout

```
anza/
├── library/        # @anzaui/anza: client runtime, elements, types, bin/
├── tools/          # crate anza-cli → `anza` binary: dev, build, check, generate, docs
├── engines/        # server template engines
│   ├── rust/       #   crate anza (engine)
│   ├── ts/         #   @anzaui/engine
│   └── py/         #   anza (PyPI)
├── create/         # @anzaui/create-anza: thin npm wrapper only
├── docs/           # markdown source of truth (only place docs are written)
├── web/            # docs website shell; web/src/docs is GENERATED, not tracked
├── .github/
├── CLEAN/          # this program (deleted at the end)
├── README.md  CHANGELOG.md  LICENSE  SECURITY.md  package.json
```

Gone from the top level: `package/`, `dist/`, `bugs/`, `plans/`, `tasks/`, `tmp/`, `test/`, `releases/`, `cf-build.sh` (moved), stray `.md` notes.

## 1. Delete from git (tracked)

| # | Path | Why | Safety check | Audit |
|---|------|-----|--------------|-------|
| S1 | `package/` | Stale old layout, 8.6 MB binary, drifted copies | `git grep -n "package/bin\|package/src"` returns nothing | H1 |
| S2 | `dist/` (root) | Accidental build output, already in `.gitignore` | `git rm -r --cached dist` | H2 |
| S3 | `web/src/docs/` (727 files) | Generated from `docs/` | CI generates it before the site build (Phase 4) | H3 |
| S4 | `tasks/docs.js` | Duplicate of `anza docs` | Diff the output of both on `docs/` first. Port missing behaviour to Rust. | H3 |
| S5 | `bugs/` | Fixed-bug writeups. History lives in git and the changelog. | Move `speed.md` facts into `CLEAN/AUDIT.md` P12 (done) | — |
| S6 | `plans/` | Superseded by `CLEAN/`. Several claim "Complete" wrongly. | `git mv plans docs/_archive/plans`, **or** delete (history keeps it). Decided (D-2): delete. | D12 |
| S7 | `plans/fixtures/ssg/` | Used by `tasks/ssg-contract-check.js` | Move to `tools/tests/fixtures/ssg/` together with S9 | — |
| S8 | `library/CHANGELOG.md` | Second, contradicting history | Merge into the root changelog, or make it the only library changelog (Phase 4) | D9 |
| S9 | `tasks/` | Loose scripts | `build.js` → `library/bin` or root `npm run build`. `publish.js` → release workflow. `ssg-contract-check.js` → `tools` test. Then delete. | H5 |
| S10 | `cf-build.sh` | Deploy glue at root | Move to `web/deploy.sh` | — |
| S11 | `tools/src/create/` **or** `library/bin/create/` | Two scaffolders kept in sync by hand | Decided (D-1): keep JS, delete `tools/src/create/`. | H4 |
| S12 | Root `package.json` `jsdom` dep + dead scripts | Nothing uses them | — | H5 |

## 2. Delete locally (untracked clutter)

Not in git, but they confuse search and tooling. Fold anything useful into `docs/` first.

| Path | Size | Action |
|------|------|--------|
| `examples/*/target`, `engines/rust/target`, `tools/src/logs/target` | ~900 MB | `cargo clean`, then add a root `target/` ignore |
| `examples/` | — | Decided (D-3): track a **minimal** set (one SSG site + one server per engine), no `target/` or `node_modules` |
| `test/` | 2 MB | Local sandbox. Delete, or move anything useful into `library/tests`. |
| `tmp/` | 0.5 MB | Delete |
| `releases/` | 47 MB | Binaries belong on GitHub Releases only. Delete locally. |
| `report.md`, `reserch.md`, `DESIGN.md`, `SKILL.md` | — | Read once, keep key decisions in `docs/`, delete |
| `engines/*/{DESIGN,DOC,STRUCTURE,SKILL}.md` | — | Merge into each engine's `README.md` + `docs/engines/`, delete |
| `engines/py/anza.egg-info`, `engines/*/dist` | — | Delete (build output) |

## 3. Merge or slim

| Item | Into | Audit |
|------|------|-------|
| Root `README.md` | Short: what Anza is, quickstart identical to `docs/intro/start.md`, links. No API examples that can drift. | D1–D4 |
| `library/README.md` | Package-level README for npm: install + one example + link to docs | — |
| `create/README.md` | 10 lines: command + link to docs | D8 |
| Hand-written `library/types/**` | Generated from JSDoc (`tsc --allowJs --declaration --emitDeclarationOnly`) | D6, D7 |
| `docs/config.toml` sidebar | Generated from the folder tree + front-matter `order` | D10 |
| `.gitignore` | Rewritten, about 20 lines: `node_modules/ target/ dist/ web/src/docs/ tmp/ *.egg-info .DS_Store`. Remove `Cargo.lock` from it. | H7, H10 |

## 4. Code-level dead code (find with tools, Phase 0b)

Run, review, then delete. Don't auto-fix blindly.

- `npx knip` in `library/`: unused files, exports and dependencies.
- `cargo machete` in `tools/` and `engines/rust/`: unused crates.
- `cargo clippy -- -W dead_code` in `tools/`.
- `lychee docs/ README.md`: broken links left behind after deletions.

## Done when

- [ ] `git ls-files | wc -l` drops by about 750 (mostly S3).
- [ ] No tracked binary over 1 MB (`git ls-files -z | xargs -0 du -k | sort -rn | head`).
- [ ] Top level matches the target layout.
- [ ] All suites from the baseline still pass.
