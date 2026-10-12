# CLEAN — Anza cleanup program

One folder that drives the cleanup. Everything else in `plans/` and `bugs/` is
superseded by this folder until the program is done.

| File | Purpose |
|------|---------|
| [AUDIT.md](./AUDIT.md) | Every finding, with an ID, severity and file:line. The source of truth for "what is wrong". |
| [FREEZE.md](./FREEZE.md) | Spec freeze: what may **not** change during cleanup, and the rules for what may. |
| [SWEEP.md](./SWEEP.md) | What to delete, move, merge or untrack. Minimal repo target layout. |
| [PHASES.md](./PHASES.md) | Ordered fix phases with exit criteria. Work top to bottom. |
| [HARDEN.md](./HARDEN.md) | **Current:** security, SEO, engine and UI fixes before re-cutting v0.6.0. |
| [DIST.md](./DIST.md) | Measured `dist/` baseline, target output layout, step-by-step browser optimization, CI budgets. |
| [RESEARCH.md](./RESEARCH.md) | Outside research and tools (with sources) backing the decisions. |

## Rules

1. **Freeze first.** No new features, elements or APIs until Phase 5 is done ([FREEZE.md](./FREEZE.md)).
2. **One phase per branch / PR.** Each PR references the audit IDs it closes (e.g. `closes R1 R4`).
3. **Delete before fixing.** Run the sweep (Phase 0) first, so fixes don't happen to code that is about to be deleted.
4. **Measure before optimizing.** The performance work (Phase 3) starts with a real load benchmark, not microbenchmarks.
5. **Docs follow code, never the reverse.** A doc that disagrees with the code is a doc bug, unless FREEZE.md says the doc is the spec.
6. When an audit ID is closed, tick it in AUDIT.md. When every phase is done, delete this folder and keep only a short entry in `CHANGELOG.md`.

## Baseline (2026-10-12)

The suites all pass today, so the problems are design and hygiene, not broken tests:

| Suite | Result |
|-------|--------|
| library `tsc --noEmit` | pass |
| library browser tests (wtr) | 413 / 413 |
| tools `cargo test` | 77 / 77 |
| engines rust / ts / py | 6 / 8 / 22 |

The cleanup must keep this table green at every phase.

## Status (2026-10-12): library phases done

Phases 0, B, 1, 2, 3 (incl. DIST stages A/B + P13) and 4 are merged on `main`. Phase 5 needs the user: push, merge the release-please PR (0.6.0), `npm run publish:npm`, then untrack `web/src/docs` (H3) once the released binary has `anza docs --pages`. Phase 6 (site redesign) comes next.

| Suite | Baseline | Now |
|-------|----------|-----|
| library browser tests | 413 | 464 |
| tools `cargo test` | 77 | 142 |
| engines rust / ts / py | 6 / 8 / 22 | 10 / 9 / 24 |
| doc imports, types, versions, SSG contract, load budgets | — | all pass (CI) |

| Cold load, Fast 4G | Before | Now |
|--------------------|--------|-----|
| docs page requests before ready | ~300 | 9 |
| import chain depth | 6–7 | 1 |
| JS (brotli) | 139 KB | 51.7 KB |
| time to ready | ~1.78 s | ~0.46 s |
| CSS save → hot swap (dev) | ~206 ms | ~27 ms |

Open: D9 (minor changelog polish), BP2/BP4 (optional build perf), H3 (untrack web/src/docs after the release).
