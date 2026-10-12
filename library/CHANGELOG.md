# Changelog: @anzaui/anza

Changes that affect the `@anzaui/anza` package. The project-wide history
(CLI, scaffolder, engines, docs site, and releases before 0.4.11) is in the
root [CHANGELOG.md](https://github.com/anzaui/anza/blob/main/CHANGELOG.md).
All Anza packages share one version number.

## [Unreleased]

### Fixed
- Service worker helpers: event streams and `/hmr` are never intercepted; the router picks the most specific matching route; strategies respond first and write the cache through `event.waitUntil` (the router passes the FetchEvent to `handle(request, event)`).
- HTML hot-swap runs the same pipeline as a cold load.

### Changed
- Element resources load on first connect by default; `eager: true` on `element()`, `view()`, `part()` and `dock()` fetches them at define time. Style, template and tags load in parallel, and pre-rendered elements mount before their files arrive.
- Storage quota checks run at most once a minute and never for the memory tier.
- New exports: `gate`, `ready`, `reset` (`/router`), `seal`, `unseal` (`/security`), `quota` (`/storage`).
- Types match the runtime: flat root `index.d.ts`, and types for `./defs`, `./sw`, `./elements/*` and `./bin/create`.

## [0.5.1] — 2026-10-12

### Fixed
- Service worker guards unsupported HTTP methods; CacheFirst no longer rejects on POST.
- Released with the `anza` CLI fix for SSG deep links rendering a bare template on refresh.

## [0.5.0] — 2026-08-27

### Changed
- Version sync with the 0.5.0 release (server template engines). No library API changes.

## [0.4.11] — 2026-07-29

### Tests
- Router base: `resolveAssetUrl` with an empty or unset `__ANZA_BASE__` leaves root-absolute asset paths unchanged.
