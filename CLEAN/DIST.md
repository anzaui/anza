# DIST — optimizing the build output for the browser

Goal: every page is **interactive in 1–2 round trips after the HTML**, never
waits on a chain of requests, ships no junk, and is cached correctly forever
(or not at all).

## 1. Measured baseline (`anza build` on `web/`, 2026-10-12)

| Metric | Value | Problem |
|--------|-------|---------|
| JS modules needed by one docs page (`/docs/intro/start`) | **267 modules, 355 KB raw** | Far above the roughly 100–200 module limit for unbundled ESM (see §4) |
| Import chain depth | **5** | Each level is a round trip (waterfall) |
| `modulepreload` hints on that page | **4** of 267 | 263 modules are found late, one level at a time |
| Element resource fetches (css + html + tags.json) | up to **~138** extra (AUDIT P1/P2) | Sequential per element |
| HTML per page | **~76 KB**, of which **35 KB is inline `<style>`** repeated in every page | 193 pages × 35 KB of the same CSS; can't be cached across pages |
| Total HTML in dist | 14.8 MB | Mostly repeated CSS and DSD |
| JS gzip: per-file vs concatenated | **176 KB vs 109 KB** | Small files compress about 38 % worse |
| Junk shipped | 199 `.d.ts`, `routes.d.ts`, ~388 `tags.json` | Not needed by the browser |
| File names | unhashed | Can't use `immutable` safely (AUDIT R5) |
| Compression | left to the CDN | No precompressed brotli at max level |

Run this again after every DIST step (the script is in Phase D step 0).

## 2. Target output

```
dist/
├── index.html, docs/**/index.html   # HTML only, no-cache, small (shared CSS linked, not inlined)
├── _headers                         # cache rules + Link preload headers (Early Hints)
├── importmap.json                   # bare → hashed names, inlined into HTML
├── assets/
│   ├── core-3f9a1c.js               # shared runtime chunk (router, ui, state)
│   ├── route-docs-8b21e0.js         # one chunk per route group (docs, pages, …)
│   ├── el-button-c41d22.js          # one chunk per element, CSS/HTML/tags inlined
│   ├── tokens-77ab01.css            # @import chains flattened, minified
│   └── *.br, *.gz                   # precompressed beside each asset
├── sw.js                            # no-cache, precache list = hashed assets
└── sitemap.xml, robots.txt
```

Rules:
1. **Every asset URL is content-hashed** → `Cache-Control: public, max-age=31536000, immutable`.
2. **HTML, `sw.js`, `importmap.json`, `routes.json`** → `Cache-Control: no-cache` with ETag.
3. **One page = HTML + at most ~3–6 JS requests + 1–2 CSS**, all discoverable from the HTML (preloaded), so the critical path depth is ≤ 2.
4. **Nothing in dist the browser doesn't need** (`.d.ts` → `types/` out dir, not dist).

## 3. How to get there (ordered by gain / risk)

### Step 1 — Stop shipping junk (low risk)
`.d.ts` and `routes.d.ts` go to a separate `types/` output. `tags.json` disappears once it is inlined (step 4).

### Step 2 — Flatten the waterfall with complete `modulepreload` (low risk, big win)
The build already knows the full import graph. For each SSG route, emit `modulepreload` for the **whole static closure** (shared core once, per route the rest), and add the same list as `Link:` headers in `_headers` for **103 Early Hints** on Cloudflare. Depth drops from 5 to effectively 1. This is the safe interim step before bundling. Downside: with hundreds of modules, the request count and `<head>` size are still high, so step 5 is still needed.

### Step 3 — CSS: flatten, minify and share across pages (low–medium risk)
- Use the **`lightningcss`** crate: bundles `@import` into one file, only applies safe minification, about 100× faster than JS tools. This fixes AUDIT P5.
- **DSD styles:** replace each per-page inline `<style>` copy with `<link rel="stylesheet" href="/assets/dock-docs-<hash>.css">` **inside** the DSD template. Browsers load and parse a stylesheet linked from many shadow roots **once** and share one `CSSStyleSheet`. It is also cached across pages, so page HTML shrinks by about half. Also preload these in `<head>` so there's no FOUC.
- Watch for the declarative `shadowrootadoptedstylesheets` attribute (WHATWG stage 2, not shipped). It would allow sharing without a fetch once it lands.

### Step 4 — Element resources inside the module (medium risk, big win)
`anza build` writes each element's CSS, HTML and tags descriptor into its JS module: the CSS as a string turned into a constructable stylesheet **once per element type** and adopted by every instance. Each element is then 1 request (0 when it's in a route chunk). Native CSS module scripts (`with { type: 'css' }`) are **not** shipped in Firefox/Safari yet, so we inline at build time. This is AUDIT P1–P4.

### Step 5 — Production bundling into chunks (medium risk, biggest win)
- Unbundled ESM is only fine for fewer than about 100–200 modules with a shallow tree. We need 267 at depth 5 for one page. Per-request overhead and the roughly 100-stream HTTP/2 limit both apply, and small files compress about 38 % worse (measured).
- **Recommended bundler: Rolldown 1.x** (Rust, Oxc-based, stable since May 2026). It gives chunking by shared usage (core / per route group / per element), scope hoisting, tree-shaking and Oxc minification in one pass.
- **Integration (decided D-6: option (a), chunks per core / route group / element):**
  - Option (a): call Rolldown's stable JS API from `anza build --bundle`. Rolldown is an npm devDependency; users already have Node.
  - Option (b): embed the `rolldown` Rust crate pinned to an exact version. No Node is needed, but the Rust API isn't covered by the 1.0 stability promise.
  - Recommend **(a)** for safety. Keep the unbundled + full-preload output (step 2) as the `--no-bundle` / dev mode.
- **Don't write our own bundler or scope-hoister.** That is exactly the kind of subtle-bug code we can't afford.

### Step 6 — Hash names + import map + caching (medium risk)
Content-hash every asset (also handled by Rolldown). Rewrite `importmap.json` to point bare specifiers at the hashed files. Precache list in `sw.js` = hashed assets. Generate `_headers`:
```
/assets/*   Cache-Control: public, max-age=31536000, immutable
/*.html     Cache-Control: no-cache
/sw.js      Cache-Control: no-cache
```
`web/worker.js` stops guessing from "has a dot" (closes AUDIT R5).

### Step 7 — Precompress (low risk)
Write `.br` (brotli quality 11) and `.gz` next to each asset at build time (`brotli` / `flate2` crates; it costs once, at build). Check on Cloudflare Workers static assets whether precompressed variants are served as-is or recompressed at the edge. Official docs don't confirm it; test with `curl -H 'Accept-Encoding: br' -I`. Zstd only applies from Cloudflare to the browser (configured in Compression Rules), not from the origin.

### Step 8 — Navigation speed (low risk, progressive)
- Anza does client-side soft navigation, so use the router's existing `prefetch` on link hover/viewport (route chunk + template) rather than relying on browsers.
- Optionally add `<script type="speculationrules">` with `prefetch` (moderate eagerness) for hard navigations. It works in Chromium only; other browsers ignore it safely.

### Step 9 — Runtime "no lag" guards
- Long docs pages: `content-visibility: auto` on below-the-fold sections.
- Hydration of many elements: yield to the main thread (`scheduler.yield()` with a `setTimeout` fallback) in batches, instead of one task per element (AUDIT S2).
- `fetchpriority="high"` on the LCP image/hero only.

## 4. Budgets (enforced in CI, Phase D exit)

| Per SSG route (cold, no cache) | Budget |
|---|---|
| Requests before interactive | ≤ 12 |
| Critical path depth after HTML | ≤ 2 |
| JS (brotli) | ≤ 60 KB shared + ≤ 15 KB per route |
| HTML (brotli) | ≤ 15 KB |
| Repeated inline CSS across pages | 0 |
| LCP on Fast 4G (Puppeteer/Lighthouse CI) | ≤ 1.8 s |
| Total Blocking Time | ≤ 150 ms |

## 5. Sources

- Bundling vs unbundled ESM, waterfall, ~100 streams, module-count limits: [Rolldown: Why do we still need bundlers?](https://rolldown.rs/in-depth/why-bundlers), [Ollie Williams: Do we still need build tools?](https://olliewilliams.xyz/blog/no-build/), [Konnor Rogers: Why we still bundle with HTTP/2](https://dev.to/konnorrogers/why-we-still-bundle-with-http2-in-2022-3noo), [Bryan Braun: ES modules in production](https://www.bryanbraun.com/2020/10/23/es-modules-in-production-my-experience-so-far/)
- Rolldown 1.0: [Announcing Rolldown 1.0](https://voidzero.dev/posts/announcing-rolldown-1-0), [rolldown on docs.rs](https://docs.rs/rolldown), [GitHub](https://github.com/rolldown/rolldown)
- Minifiers (oxc fastest, swc slightly smaller; oxc minifier still maturing): [minification-benchmarks](https://github.com/privatenumber/minification-benchmarks), [Oxc minifier](https://oxc.rs/blog/2025-03-13-minifier-alpha), [Oxc in 2026 review](https://toolchew.com/en/review-oxc-2026/)
- CSS: [Lightning CSS](https://lightningcss.dev/), [bundling](https://lightningcss.dev/bundling.html)
- DSD shared styles: [web.dev Declarative Shadow DOM](https://web.dev/articles/declarative-shadow-dom), [Edge explainer: declarative adoptedStyleSheets](https://microsoftedge.github.io/MSEdgeExplainers/ShadowDOM/explainer.html), [WHATWG #10673](https://github.com/whatwg/html/issues/10673), [EisenbergEffect: sharing styles in DSD](https://eisenbergeffect.medium.com/sharing-styles-in-declarative-shadow-dom-c5bf84ffd311)
- Caching and hashing: see [RESEARCH.md §2](./RESEARCH.md)
- Compression and Early Hints: [Cloudflare 103 Early Hints](https://developers.cloudflare.com/workers/examples/103-early-hints/), [Cloudflare content compression](https://developers.cloudflare.com/speed/optimization/content/compression/), [Precompressed HTML on Workers](https://nooshu.com/blog/2026/02/21/precompressed-html-at-the-edge-eleventy-meets-cloudflare-workers/), [Web compression in 2026](https://blog.andr2i.com/posts/2026-06-03-web-compression-in-2026-brotli-zstd-and-compression-patterns)
- Speculation Rules (Chromium only, safe to ignore elsewhere): [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API), [Chrome prerender](https://developer.chrome.com/docs/web-platform/prerender-pages)
