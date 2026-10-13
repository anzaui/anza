# Build

The `anza` CLI resolves your ESM import graph, copies reachable files into `dist/`, generates type declarations, and serves the result. `anza dev` serves unbundled modules. `anza build` bundles them with Rolldown when it is installed. You call both through npm scripts.

## Dev Server

```bash
npm run dev
```

This runs `anza dev` under the hood. It starts a server on `http://localhost:3000` and:

1. Resolves the import graph from the module scripts and stylesheets of every HTML file under `src/`, plus `src/sw.js`
2. Copies reachable modules into `dist/`, unbundled
3. Writes `dist/importmap.json` with resolved library mappings
4. Replaces any import map in each HTML document with an inline `<script type="importmap">` holding the same mappings
5. Emits **Mode A SSG** for public routes (same contract as production — see below)
6. Watches `src/` for changes and rebuilds incrementally
7. Pushes HMR events via SSE

CSS files are hot-swapped. JS and HTML changes trigger a reload. A hard refresh serves the SSG HTML from `dist/`; soft-nav loads page fragments (not full SSG documents).

The dev server answers `/sw.js` with a worker that deletes every cache and unregisters itself, so a service worker from an earlier production build can't serve stale files.

If the port is taken, the server tries the next ports and logs the one it uses. Override the port:

```bash
npx anza dev --port 8080
```

The dev server listens on `127.0.0.1` only, so other machines can't reach it. It also answers only requests addressed to `localhost`, `127.0.0.1`, `[::1]` or the `--host` value (anything else gets `403`, which blocks DNS-rebinding pages), and sends no CORS headers, so other sites can't read its responses. To test from a phone or another machine, bind every interface:

```bash
npx anza dev --host 0.0.0.0
```

With `0.0.0.0` (or `::`), requests by IP address (`http://192.168.1.20:3000`) are accepted, but host names other than `localhost` are still refused.

## Compile-Time Route Validation

During both `dev` and `build`, the CLI checks each route pattern (e.g. `'/blog/:slug'`) against the spec's `params` array. If a dynamic segment has no matching entry, it prints a warning:

```text
[anza] WARN  <page-blog-post> in pages/blog/index.js — route "/blog/:slug" has dynamic segment ":slug" but no matching entry in the `params` array. The library will inject it as a String. Add `{ name: 'slug', type: String }` to silence.
```

The warning does not fail the build. The parameter is passed to the page as a string.

## Production Build

```bash
npm run build
```

This runs `anza build`. Same graph resolution, but starts from a clean `dist/` and fails on unresolved imports or syntax errors.

Production builds also optimize CSS with [Lightning CSS](https://lightningcss.dev/): every stylesheet in `dist/` has its local `@import` chain inlined (`/tokens/index.css` becomes one request instead of eleven) and is minified for current browsers (Chrome/Edge 120+, Firefox 121+, Safari/iOS 16.4+). External `@import url(https://…)` rules are kept. A stylesheet that Lightning CSS can't process is left as written, with a warning. `anza dev` serves CSS exactly as written.

Production builds also put each element's resources into its module: when an `element()`, `view()`, `part()`, `dock()` or `page()` spec names a relative stylesheet, template or `.tags.json` descriptor, the built module carries their contents and the runtime uses them instead of fetching (one constructable stylesheet per element type, adopted by every instance). `page()` HTML templates stay files, since they're route-sized and the SSG HTML already contains them, and so do stylesheets with `@import` or relative `url()`. `anza dev` and apps without a build fetch the files as before.

### Bundling (production)

`anza build` bundles the module graph into a few minified, content-hashed ES module chunks under `dist/assets/`, using [Rolldown](https://rolldown.rs) 1.x through its JS API. Rolldown is a devDependency of **your project** (projects made by `npm create @anzaui/anza` already list it):

```bash
npm install -D rolldown
```

| Chunk | Contains |
|-------|----------|
| `app-<hash>.js` | The entry (`src/app.js`) and the modules only it imports |
| `core-<hash>.js` | Library modules that two or more routes need |
| `route-<group>-<hash>.js` | The page modules of one route group (`route-index` for `/`, `route-docs` for `/docs/*`, …) |
| `elements-<hash>.js` | Element, view, part and dock definitions that every route needs |
| `el-<name>-<hash>.js` | One chunk per element that only some routes need |

Modules loaded only through `import()` get their own chunks. Each page preloads the chunks its entry imports (`<link rel="modulepreload">` and the `Link` header in `_headers`), so all of them start downloading with the HTML. Since bare `@anzaui/anza/*` imports are resolved during bundling, the import map is dropped (it's kept only for specifiers that stay external). The bundled source modules are removed from `dist/`. `import.meta.url` keeps pointing at each module's original location, so relative `new URL('./x', import.meta.url)` and element templates resolve as before.

If Node, the bundle script or `rolldown` can't be found, or an HTML page has an inline `<script type="module">` that needs the import map, the build warns and ships the unbundled modules with full `modulepreload` lists. `anza build --no-bundle` always does that. `anza dev` never bundles.

Public routes get **Mode A SSG** (also during `anza dev`): contentful HTML with open Declarative Shadow DOM under `dist/<route>/index.html`, so hard refresh works on a plain static server. Publish `dist/` as the **document root**. Asset URLs are site-root paths (`/app.js`, `/tokens/...`) — never `/dist/...`. SSG pages also preload the fonts that the app shell (`src/index.html`) preloads with `<link rel="preload" as="font">`. They also copy the shell's `icon`, `alternate icon`, `apple-touch-icon` and `manifest` links, and the build copies those files (and the manifest's icons) into `dist/`.

When the page’s CSR fragment path would collide with that SSG `index.html`, the emitter keeps the fragment as `template.html` and rewrites the built page module plus `routes.json` so soft-nav fetches the fragment — not the full document. Overview: [SSG & SEO](../ssg/index.md). Contract: [Page HTML contract (Mode A SSG · Mode B templates)](../ssg/contract.md). Hydration: [Hydration (DSD adopt)](../ui/hydration.md).

### SEO (`ssg.json`)

An optional `ssg.json` in the project root or inside `src/` configures the site:

```json
{
  "origin": "https://example.com",
  "siteName": "Example",
  "image": "/og.png",
  "jsonLd": true,
  "sitemap": true,
  "robots": true
}
```

| Key | Default | Effect |
|-----|---------|--------|
| `origin` | none | Absolute URLs for canonicals, `og:url`, sitemap `<loc>` and the robots `Sitemap:` line. Env `ANZA_SITE_ORIGIN` overrides it. Without it, these use site-root paths and the build warns |
| `siteName` | `Anza` | Last part of page titles, `og:site_name`, the JSON-LD `WebSite` name |
| `image` | none | Social preview image for pages without their own `seo.image` (site-root path or absolute URL, ideally 1200×630). A site-root path is copied from `src/` into `dist/` |
| `base` | none | Deploy base path (see [GitHub Pages](#github-pages)). Env `ANZA_BASE_PATH` overrides it |
| `jsonLd` | `true` | Emit the JSON-LD script |
| `sitemap` | `true` | Emit `dist/sitemap.xml` |
| `robots` | `true` | Emit `dist/robots.txt` |

Each page can set its own values with the `seo` option of `page()`:

```javascript
import { page } from '@anzaui/anza/ui';

page('/pricing', {
  tag: 'page-pricing',
  via: ['main'],
  template: { html: './index.html' },
  seo: {
    title: 'Pricing — Example',
    description: 'Plans and prices for teams of every size.',
    image: '/og/pricing.png'
  }
}, import.meta.url);
```

`seo` accepts `title`, `description`, `canonical` and `image`. Every SSG page gets:

- **Title.** `seo.title` when set. Otherwise `"{H1} — {Section} — {siteName}"`, where H1 is the page's first `<h1>` (or a name made from the path) and Section is the parent page's H1 for pages two or more levels deep (`/docs/router/pages` → "Pages — Router — Anza"). Repeated parts are dropped.
- **Description.** `seo.description`, else the first `<p>` cut at a word boundary (about 155 characters), else the title.
- **Canonical link** and **Open Graph / Twitter tags**: `og:type` (`article` under `/docs/`, else `website`), `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image` (from `seo.image`, else the site `image`), `twitter:card` (`summary_large_image` with an image, else `summary`), `twitter:title`, `twitter:description`, `twitter:image`.
- **JSON-LD**: one `@graph` with `WebSite`, `WebPage`, a `BreadcrumbList` for nested pages, and a `TechArticle` for docs pages. Docs pages also carry `dateModified` and `article:modified_time`.

`dist/sitemap.xml` lists every SSG route. Each `<lastmod>` is the date of the last git commit that touched the page's source files, or the file modification time outside git. It is never the build time. `dist/robots.txt` points at the sitemap.

A route that ends in `/index` names the section page: `/docs/router/index` is titled and linked as `/docs/router`. The docs generator gives section index pages the URL `/docs/<section>` directly.

## Diagnostics

```bash
npx anza doctor
npx anza check
```

| Command | Behavior |
| ------- | -------- |
| `anza doctor` | Structure contract — soft mode: **errors** exit non-zero; **warnings** print but exit 0 |
| `anza doctor --strict` | Same findings as check — warnings fail |
| `anza check` | Strict structure check for CI (`anza check && anza build`) |

Validates required spine (`package.json`, `src/index.html`, `src/app.js`), recommended tokens/styles/SW/importmap, optional slots + index-per-folder barrels, optional `anza.json` (incl. `sw` string\|array), legacy `elements/` coexistence, undeclared page trees, and **via → dock** consistency (`rootDock` warn; unknown `via` error). Contract: [Structure](structure.md) (single source of truth + Troubleshooting).

### CI

```bash
anza check && anza build
```

```json
{
  "scripts": {
    "ci": "anza check && anza build"
  }
}
```

Doctor/check findings append `docs/intro/structure.md` so CI logs link back to the contract.

### Deploy

After `npm run build`, publish `dist/` as the **document root** of any static host (nginx, Netlify, Cloudflare Pages, S3, …). Asset URLs are site-root paths (`/app.js`, `/tokens/...`) — never `/dist/...`.

#### Headers and caching (`_headers`)

`anza build` writes `dist/_headers` in the format Cloudflare (Workers static assets and Pages) and Netlify read:

- `/*` gets `Cache-Control: no-cache`, so browsers revalidate every file (a cheap `304` with `ETag`) and a deploy shows up on the next normal reload. HTML, `sw.js`, `importmap.json`, `routes.json` and page templates always stay `no-cache`.
- `/*` also gets `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and `Content-Security-Policy: frame-ancestors 'self'` (no framing by other sites). A `script-src` policy is left to you: SSG pages carry inline `<script>`s (the import map, JSON-LD), so it needs their hashes.
- `/*.html` gets `X-Robots-Tag: noindex`. Pages are served at extensionless URLs (`/docs/intro`), so a URL ending in `.html` is a fragment (`template.html`, a dock template) or `404.html`, which search engines shouldn't index.
- `/assets/*` gets `! Cache-Control` (so it doesn't merge with the `/*` value) and `Cache-Control: public, max-age=31536000, immutable`. Everything in `dist/assets/` has a content hash in its name: the Rolldown chunks, and a copy of every stylesheet, font and image that HTML, JS, JSON or a stylesheet's `url()` refers to by URL (`/assets/shared-1a2b3c4d.css`). The build rewrites those references (HTML `href`/`src`, quoted string literals in modules and `routes.json`, CSS `url()`, `Link` preloads). Fonts and images keep their original file too, for URLs built at run time; a stylesheet's original is removed when nothing refers to it any more.
- `dist/sw.js` starts with `self.__ANZA_PRECACHE__ = [...]`: the app shell, its module scripts and every hashed script and stylesheet (fonts are cached on first use), so the service worker can precache the exact files of this build (`const shell = self.__ANZA_PRECACHE__ ?? [...]` in the scaffolded `src/sw.js`).
- Each SSG route gets a `Link` header with its stylesheets (`rel=preload; as=style`) and its first modules (`rel=modulepreload`), most important first. Cloudflare can send these as **103 Early Hints**, so the browser starts fetching before the HTML arrives. Cloudflare allows at most 100 rules and 2,000 characters per line, so the list is cut to one line, and sites with more than about 50 routes get one rule per first path segment (`/docs` and `/docs/*`) with the preloads every route in it shares.

The build also writes `dist/404.html`: the app shell (`src/index.html`) titled "Page not found" with `<meta name="robots" content="noindex">`. Hosts that support it (GitHub Pages, Netlify, Cloudflare) serve it with status `404` for unknown URLs, and the app still boots and renders its fallback. `anza dev` serves it the same way.

On Cloudflare, `_headers` applies only to responses the static assets layer serves. A Worker that builds its own responses must set the same headers itself (see `web/worker.js`). Other hosts ignore the file: copy its rules into your server config.

#### Precompressed files (`.br`, `.gz`)

Production builds write `file.br` (brotli, quality 11) and `file.gz` (gzip, level 9) next to every `.html`, `.js`, `.css`, `.json` and `.svg` file of 1 KB or more. They're compressed once at build time at the highest level, which a CDN compressing on the fly usually doesn't use. The output is deterministic. To serve them, turn on precompressed lookup in your server:

| Server | Setting |
|--------|---------|
| nginx | `gzip_static on;` and, with the [brotli module](https://github.com/google/ngx_brotli), `brotli_static on;` |
| Caddy | `file_server { precompressed br gzip }` |
| Apache | `mod_rewrite` rules that serve `file.br` when `Accept-Encoding` has `br`, with `Content-Encoding: br` and the original `Content-Type` |
| Express / Node | a static middleware with precompressed support, such as `express-static-gzip` |

The server must send `Vary: Accept-Encoding` and the original file's `Content-Type`, not `application/x-brotli`.

Cloudflare and most CDNs compress responses themselves and don't look for `.br` siblings, so there the files are just unused extra uploads. Remove them before deploying if they matter (`find dist -name '*.br' -o -name '*.gz' | xargs rm`). `anza dev` never writes them.

#### GitHub Pages

A [GitHub Pages project site](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#types-of-github-pages-sites) is served under `/<repository>/` (user/org sites use `owner.github.io` at `/`). Root-absolute browser URLs like `/styles/shared.css` resolve against the **domain** root ([URL standard](https://developer.mozilla.org/en-US/docs/Web/API/URL_API/Resolving_relative_references)), so they 404 on project Pages unless rewritten.

**`*.github.io/<repo>` (no custom domain):** set `"base": "/your-repo"` in `ssg.json` (next to or inside `src/`) or env `ANZA_BASE_PATH` so the build injects `globalThis.__ANZA_BASE__`, rewrites asset URLs in SSG HTML, and soft-nav style/template fetches hit `/your-repo/styles/...`. Publish `dist/` as the artifact **document root** — do not nest files under a `your-repo/` folder; Pages adds the repo prefix.

**Custom domain on the project:** Pages serves the site at the **domain root** (e.g. `https://anza.aduki.org/`), not under `/your-repo/` — see [About custom domains and GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages). Clear `base` / `ANZA_BASE_PATH` (omit or `""`) so assets resolve at `/styles/...`, `/app.js`, `/docs/...`. Include a `CNAME` in the published artifact when deploying via Actions.

**One-time repo setup:** Settings → Pages → Source: **GitHub Actions** (or your preferred Pages source).

Set canonical / sitemap origin in `ssg.json` (`origin`) or env `ANZA_SITE_ORIGIN` at build time.

## Generate

Thin helpers (not a Nest schematic platform). Writes into convention slots or `anza.json` remaps and updates the slot `index.js` barrel:

```bash
anza generate page about
anza generate page docs-home --tree docs --route /docs --via main,docs,content
anza generate dock sidebar --parent main
anza generate view card
anza generate part button
```

| Kind | Default slot | Files |
| ---- | ------------ | ----- |
| `page` | first `pages[]` (usually `pages/`) | `index.js` + `index.html` + `index.css` |
| `dock` | `docks/` | same; **no** `404.html` (fallbacks by reference) |
| `view` | `views/` | same |
| `part` | `parts/` | same |

Flags: `--tree`, `--route`, `--via` (comma-separated), `--parent`, `-s/--src`.

## Docs Generator

`anza docs` turns a folder of Markdown files and its `config.toml` into documentation. It has two modes:

```bash
anza docs --pages                                # docs/*.md → page folders in an app ([pages] out, e.g. web/src/docs), then `anza build`
anza docs --config docs/config.toml --out _site  # docs/*.md → a complete static site in _site/
```

The standalone site needs no other step: `_site/` holds every page as `<path>/index.html`, the theme (`styles/`, `tokens/` with its fonts, `docks/`, `views/code/`), `app.js` (soft navigation) and, when configured, `favicon.<ext>`, `sitemap.xml` and `robots.txt`. Upload it as is.

In both modes:

- `x/page.md` is served at `<base>/x/page`, and a section's `x/index.md` at `<base>/x` (the file lands in `x/index.html`). Sidebar links and links between pages use those routes.
- Only relative links to `.md` files are rewritten to routes. Absolute URLs (`https://…/README.md`) and site-root paths (`/x.md`) are left as written.
- Every heading gets a GitHub-style `id`, so `page.md#getting-started` links work.

### Serving under a sub-path

`site.base` is the URL prefix of the docs. The standalone site is laid out to be served at `<base>/`: the home page is `_site/index.html`, and every page, asset, font, favicon, canonical and sitemap URL starts with `<base>/`. Use `base = ""` (or `"/"`) to serve it at the domain root.

```toml
[site]
title = "Rust engine — Anza"
base = "/rust"            # served at https://anzaui.github.io/rust/
out = "_site"

[entry]
home = "index.md"
route = "/rust"           # the home page: same as base
root_dock = "docs"

[assets]
styles = "../.anza/web/src/styles"
tokens = "../.anza/web/src/tokens"
view_code = "../.anza/web/src/views/code"
docks = "../.anza/web/src/docks"
favicon = "../logo.svg"   # copied to _site/favicon.svg

[seo]
origin = "https://anzaui.github.io"   # canonical URLs: https://anzaui.github.io/rust/…
```

Preview locally the way the host serves it, under the base:

```bash
anza docs --config docs/config.toml --out _site
mkdir -p /tmp/preview && ln -sfn "$PWD/_site" /tmp/preview/rust
python3 -m http.server 8000 --directory /tmp/preview   # open http://localhost:8000/rust/
```

### Publishing to GitHub Pages under a sub-path

A project site (`https://<owner>.github.io/<repo>/`) is served under `/<repo>/`, so set `base = "/<repo>"` and publish the out folder as the Pages artifact root:

```yaml
- name: Build docs
  run: anza docs --config docs/config.toml --out _site
- uses: actions/upload-pages-artifact@v4
  with:
    path: _site
```

With a custom domain the site is served at the domain root: use `base = ""`.

## Flags

| Flag | Default | Description |
| ------ | ------- | ----------- |
| `-s, --src` | `src` | Source directory |
| `-p, --port` | `3000` | Dev server port (the next free port is used if it is taken) |
| `--host` | `127.0.0.1` | Dev server bind address (`0.0.0.0` or `::` to serve the LAN) |
| `--dist` | `dist` | Output directory |
| `--types` | `types` beside `--dist` | With `build` — where the generated `.d.ts` files go |
| `--no-bundle` | off | With `build` — ship unbundled modules instead of Rolldown chunks |
| `-e, --entry` | module scripts of `src/**/*.html` | With `build` / `dev` — extra entry modules (repeatable) |
| `--strict` | off | With `doctor` — promote warnings to failures |
| `--tree` | first `pages[]` | With `generate page` — page tree under `src` |
| `--route` | `/{name}` | With `generate page` — route path |
| `--via` | `rootDock` | With `generate page` — comma-separated via chain |
| `--parent` | `rootDock` | With `generate dock` — parent registry key |

## Output

After `npm run build` with Rolldown installed (paths depend on your routes):

```text
dist/
  index.html               # SSG HTML for /
  about/
    index.html             # SSG HTML for /about
  docs/
    router/
      index.html           # SSG HTML for the /docs/router section page
  assets/
    app-1a2b3c4d.js        # Entry chunk (see Bundling)
    core-5e6f7a8b.js
    route-docs-9c0d1e2f.js
    tokens-11111111.css    # Hashed stylesheets, fonts and images
  pages/
    entry/
      index.html           # Page fragment for soft-nav (template.html if an SSG page uses this path)
  sw.js                    # Service worker, starts with self.__ANZA_PRECACHE__
  routes.json              # Route manifest for the router
  404.html                 # App shell for unknown URLs (noindex)
  _headers                 # Cache, security and Link headers (Cloudflare/Netlify format)
  sitemap.xml              # Every SSG route with <lastmod>
  robots.txt               # Points at the sitemap
  favicon.ico              # Copied when src/favicon.ico exists
  index.html.br            # Precompressed siblings of files >= 1 KB
  index.html.gz
types/                     # Beside dist/, never shipped (--types to move it)
  index.d.ts               # Global HTMLElementTagNameMap augmentation
  routes.d.ts              # RouteMap and element interfaces
```

Bundled source modules are removed from `dist/`. Modules the service worker imports stay where they are. `importmap.json` is kept only when some bare specifier stays external.

With `anza build --no-bundle`, or when Rolldown is missing, `dist/` instead mirrors `src/`: `app.js`, `pages/`, `docks/`, the library modules your graph reaches, and `importmap.json`. `anza dev` writes that layout too (with SSG HTML, `404.html`, `_headers`, `sitemap.xml` and `robots.txt`), but no `assets/` and no `.br`/`.gz` files.

Type declarations are for your editor, not the browser, so they go to `types/` next to `dist/` (`anza build --types <dir>` to change it). Serve `dist/` as the site root. URLs are site-root paths (`/assets/app-1a2b3c4d.js`), never `/dist/...`.
