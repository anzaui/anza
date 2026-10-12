# HARDEN — fixes before re-cutting v0.6.0

Created 2026-10-13. The first v0.6.0 run failed: the Windows binary build broke (bash `VAR=x` syntax under PowerShell) and a library test was flaky. Re-auditing at the user's request found more problems. **Plan:** fix everything below, then delete the `v0.6.0` tag and GitHub release (no binaries were attached, and nothing was published to npm), then re-create it at the fixed commit (see "Re-release").

Severity: **H** high · **M** medium · **L** low. Owner lanes run in parallel. Only the Rust lanes compile Rust, and they share `target/`.

## Done already

| ID | What | Commit |
|----|------|--------|
| F1 | Windows release build: `CARGO_TARGET_DIR` via `env:`; `workflow_dispatch` for an existing tag | 82407d7 |
| F2 | Flaky Web Lock test: waits for the lock holder instead of a fixed 30 ms sleep (5/5 passes) | caf702b |
| U0 | 305 docs links showed "api.md"-style file names; labels are now page titles. `npm run doc:links` checks this in CI | 26aacbc, f87431b |
| W0 | favicon.ico regenerated from the logo; apple-touch-icon added to the shell | 1bc114c |

## Lane A — CLI / generator (Rust, `tools/`)

| ID | Sev | Problem | Fix |
|----|-----|---------|-----|
| X2 | M | Dev server binds `0.0.0.0`, `CorsLayer::permissive()`, no Host check (`server/runner.rs:126,178`): the LAN and any website can read dist, mocks and `/hmr` | Bind `127.0.0.1` by default, `--host` to opt in. No permissive CORS. Reject non-localhost `Host` |
| X3 | M | SSG param values may be `..` / `\` → writes outside dist (`extract/routes.rs:357`, `build/ssg.rs:798`). Values are interpolated into HTML unescaped (`ssg.rs:1359`) | Reject `.`, `..`, `\`, `:`, NUL. Assert the output stays under dist. HTML-escape interpolations |
| X8 | L | Dev fallback `:param` accepts `..` (`runner.rs:398-405,469`). `anza-state` JSON doesn't escape `<` | Reject dot segments in `match_route`. Escape `<` as `<` |
| S1 | H | 125 pages titled from the URL ("Index", "Api"…). 63 share 12 titles (`extract/routes.rs:152`, `ssg.rs:626`) | Title = seo.title → H1 → path. Format `"{H1} — {Section} — {siteName}"` |
| S2 | M | Sitemap has no `<lastmod>` (`ssg.rs:1553`) | Last git commit date of the page sources, falling back to mtime. W3C datetime. Never build time |
| S3 | M | 18 URLs end in `/index`. `/docs/index` duplicates `/docs`. Section roots have no route | Section index canonical at `/docs/<section>`. Drop or redirect `/docs/index` |
| S4 | M | Soft 404s (unknown paths → shell 200). `/x` and `/x/` both 200. Raw fragments reachable (`web/worker.js`) | Emit `404.html` and return 404. 301 `/x/` → `/x`. `X-Robots-Tag: noindex` for fragments in `_headers` |
| S5 | L | Descriptions cut mid-word at 160 chars. Duplicates ("Common problems…" ×10) | Cut at a word boundary (~155 chars). Add the section name to short/duplicate ones. Build warning |
| S6 | M | No og:image, og:type, og:site_name, twitter:*. `seo.image` dropped by the `SeoMeta` struct | Pass the image through, add a site default image in `ssg.json`, emit the full OG/Twitter set |
| S7 | L | JSON-LD only WebSite+WebPage, no `@id` | `@id` graph, `TechArticle` for docs (headline, dateModified), `BreadcrumbList` |
| S8 | H | Docs generator emits **no heading ids**, so every `#section` link goes nowhere | GitHub-style slug ids (same rule as `tasks/doc-links-check.js`), with duplicate suffixes |
| W1 | M | SSG `<head>` hard-codes only `/favicon.ico`. `apple-touch-icon.png` not shipped | Copy the shell's `icon` / `alternate icon` / `apple-touch-icon` / `manifest` links into SSG heads, and copy the referenced files |
| X9 | L | `_headers` has no security headers | Add `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors` via CSP (CSP-safe output already) |

## Lane B — server engines (`engines/{rust,ts,py}`)

| ID | Sev | Problem | Fix |
|----|-----|---------|-----|
| G1 | H | Py pure-Python Ed25519 fallback: not constant-time, accepts any key | Require `cryptography`, exactly 32-byte keys, drop the fallback |
| G2 | H | TS signing fails open (missing key → unsigned envelope). Rust HMAC signs with an empty key | Validate keys in `Setup.run()` in all three engines: HMAC ≥ 32 bytes, Ed25519 seed = 32 bytes |
| G3 | H | Rust verify panics on a non-ASCII signature (`&s[i..i+2]`) | Byte-wise hex decode, one shared `hex` module |
| G4 | H | Signed message `ts:slot:html` is ambiguous. No freshness or slot check (replay into another slot) | Signature v2: length-prefixed fields + `verify_envelope(key, env, {maxAge, slot})` in all three. Version field in the envelope |
| G5 | M | Py: unbounded cache growth from path aliases. NUL → 500. Errors leak absolute paths | Normalize + reject `..`, NUL, `\`. No disk load on cache miss for request input. Path-free errors |
| G6 | M | Any cached template is renderable from a route (`${route}.html` fallback). TS has no `safe_route` | Remove the bare-route fallback. `safe_route` in TS. Optional allowlist/prefix for fragments |
| G7 | M | Keys in `Debug`/repr output. Rust `Setup::ed25519` turns a missing file into an empty key | Redacted `Debug`/repr. Error at setup |
| G8 | M | TS verify accepts non-canonical hex (`sig+"zz"` verifies) | Strict lowercase/even-length hex in all three |
| G9 | M | No escaping API. TS `{{toString}}` reads prototype props | Shared `escape_html` export. Opt-in `escape: true` (`{{x}}` escaped, `{{{x}}}` raw). `Object.hasOwn` |
| G10 | L | No template size limit. Rust/Py follow symlinks out of the root. TS watcher reloads the whole tree without debounce | Size cap, don't follow out-of-root symlinks, debounce |
| GP1 | perf | Rust clones the whole `Template` per render (`lookup.rs:13`). `Data<T>` serializes per slot (300×). Signing key rebuilt per call (all engines). Linear slot scans. Py dataclass/getattr per call | `Arc<Template>`. One-shot `Value`. Cache key objects. Index-resolved slots. Precompiled Py renderer. Target: unsigned render ≤ 1.5× plain concatenation |
| GC1 | M | The three engines disagree: digest (BLAKE3 vs SHA-256), page pipeline, bool/object stringification, missing-key behaviour, watch, symlinks | Written contract in `docs/engines/contract.md` + shared golden fixtures run by all three suites |

## Lane C — browser library (`library/`) — DONE 2026-10-13

Merged b4defa3…5956f53 + ac2ff8a (ui-text `as` allowlist). 531 browser + 6 scaffolder tests. Notes for lane D:
- Sanitizer output drops `id` and `style`. Only http/https/mailto URLs survive.
- `methods` and form hooks (`reset()`, `disabled(v)`, `restore(state)`) run with `this` = element. The `update` context has `internals`.
- Checkbox, toggle, select and radio fire `change` (bubbles, composed, no detail) after the form value updates. Form reset restores the first-mount value. `ui-button type=submit` adds `name=value`.
- Non-bubbling `on()` events (close, cancel, toggle, focus) now fire. `ui-dialog` emits `close`.
- SW: never caches no-store/private/Vary:*/Authorization/credentialed cross-origin. Routes match the worker's origin unless the pattern names one. Advise clearing caches on logout.
- Scaffolder: `npm create @anzaui/anza <name> -- --force` to overwrite. `.` works.
- New attribute values: stat `trend=up|down`, surface `variant=bordered`, text `color=muted`, tooltip `right-end/left-end`. Popover, menu and select load the popover polyfill.
- Open: `ui-dialog`'s `open` attribute does not open the dialog by itself. Either implement it or document `showModal()`.


| ID | Sev | Problem | Fix |
|----|-----|---------|-----|
| X1 | H | Fallback sanitizer bypass: `java\tscript:` / `\x01javascript:` survive (`security/sanitize.js:72-80`). `src` unchecked. `style`/`id` allowed. `target` without `noopener` | `new URL()` protocol allowlist (http/https/mailto) for href and src. Drop `style`/`id`. Force `rel=noopener noreferrer` |
| X4 | M | SW caches authenticated `/api/*` (ignores `no-store`/`private`/`Authorization`). Routes match cross-origin paths | Skip caching for those. Match the site's origin only. Document clearing on logout |
| X5 | M | `npm create … .` overwrites existing files | Refuse if any target exists, unless `--force` |
| X9b | L | `<anza-link>` sets `href` without a `javascript:` filter. `in cache` matches prototype keys. Legacy `Sanitizer.sanitize` path assigns `innerHTML` first. `anza-state` can be clobbered | Filter the scheme. `Object.hasOwn`. Remove the dead legacy path. Query `script#anza-state[type="application/json"]` |
| E1 | H | `ui-dialog` `showModal/close`, `ui-drawer` `show/hide`, `ui-menu` `show/hide/toggle` throw: methods installed without context (`element.js:547`) | Bind methods with the element context, plus a test per overlay |
| E2 | H | `ui-input`: every instance `required`, updates throw (`internals`), reset not wired. `ui-checkbox` toggling throws. `ui-button` never submits `value`. toggle/radio/select fire no `change` | Fix form-associated plumbing (`internals` in the change context, form callbacks), emit `change` |
| E3 | M | Element attribute values documented but not implemented (stat `trend`, surface `bordered`, text `muted`, tooltip `*-end`), popover polyfill claim | Implement where cheap, otherwise fix docs (lane D) |

## Lane D — docs (after A–C land)

UI docs audit 2026-10-13. Rewrite the stale 0.6.0 pages (lifecycle, elements→factory, templates, quickstart, intro index/structure/build), the wrong API claims (HMR event `anza:hmr:*`, per-prop `update` batching, dock not rAF-batched, `state` needs `form`, `raw` absent, guards), the broken examples (invalid tag names, missing comma, `{{ }}` in UI templates), and the per-element tables. Then REMOVE/MERGE:
- Merge the 6 category pages into `elements/index.md` and drop the "Phase" tables.
- Trim `overlay.md`.
- Fold `ui/advanced.md` into props/lifecycle/hydration.
- Fold `ui/quickstart.md` into `ui/index.md`.
- Rename `ui/elements.md` → `ui/factory.md` and `ui/forms.md` → `ui/form-associated.md`.
- Delete the orphaned `web/src/docs/ui/styles` and `web/src/docs/ssg/expand`.

Also document `anza:ready`, `ctx.adopted`, element `::part`/`--el-*`/`:state()`, event `detail` shapes, signature v2, escaping, the dev server `--host`, and the SEO fields. Use the new heading ids for every `#anchor`.

## Lane E — CI / supply chain (lead)

| ID | Sev | Problem | Fix |
|----|-----|---------|-----|
| X6 | L | **Done:** Actions pinned by tag, `cross --git` HEAD, mdbook `latest`, `npm ci || npm install`, `ci.yml` without `permissions:` | Pin by SHA, `cross --locked --tag`, pin mdbook, drop the install fallback, `permissions: contents: read` |
| X7 | L | `npm audit`: 17 high in dev-only tooling (puppeteer chain). `cargo deny`: rkyv advisory via lightningcss (unreachable), smartstring unmaintained | **Done:** CI `supply-chain` job runs `npm audit --omit=dev` (library, web, engines/ts: 0) and `cargo deny check advisories` (CLI + engine). `tools/deny.toml` records the two accepted advisories with reasons. The dev-only test-runner chain is accepted: npm's only "fix" is a downgrade to @web/test-runner 0.7.31. Re-check on the next test-runner release |

## Re-release

1. Merge lanes A–E. All suites, budgets and the new security tests green on `main`.
2. Delete the failed release: `gh release delete v0.6.0 --cleanup-tag` (it has no assets, and nothing was published).
3. Update `CHANGELOG.md` `[0.6.0]` with the hardening fixes. Keep the version at 0.6.0, since it was never published.
4. Tag the fixed commit `v0.6.0` and run `release.yml` (`workflow_dispatch`, tag `v0.6.0`). It creates the release from the changelog section and attaches all 5 binaries.
5. Set `last-release-sha` in `release-please-config.json` to that commit, so the next release PR doesn't re-list these fixes. Close any release PR release-please opened in the meantime.
6. Publish to npm per `NPM.md`.
