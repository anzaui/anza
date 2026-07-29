# Build

The `anza` CLI resolves your ESM import graph, copies reachable files into `dist/`, generates type declarations, and serves the result. You call it through npm scripts.

---

## Dev Server

```bash
npm run dev
```

This runs `anza dev` under the hood. It starts a server on `http://localhost:3000` and:

1. Resolves the import graph from `src/app.js`, `src/sw.js`, and HTML module scripts
2. Copies reachable modules into `dist/`
3. Writes `dist/importmap.json` with resolved library mappings
4. Injects `<script type="importmap" src="/importmap.json">` into HTML
5. Emits **Mode A SSG** for public routes (same contract as production — see below)
6. Watches `src/` for changes and rebuilds incrementally
7. Pushes HMR events via SSE

CSS files are hot-swapped. JS and HTML changes trigger a reload. A hard refresh serves the SSG HTML from `dist/`; soft-nav loads page fragments (not full SSG documents).

Override the port:

```bash
npx anza dev --port 8080
```

---

## Compile-Time Route Validation

During both `dev` and `build` phases, the Rust compiler performs design-by-contract checks on all page and dock definitions. It scans route pattern strings (e.g. `'/blog/:slug'`) and cross-references them with the declared `params` and `query` contract arrays.

If a route parameter (like `:slug`) is present in the route but missing from the component's `params` array, the CLI prints a descriptive warning:

```text
[WARN] Page tag 'page-blog-post' defines route '/blog/:slug' but has no parameter contract declared for ':slug'.
```

These warnings are non-blocking: compilation still succeeds and the router will fallback to string matching, but developers get early visibility into contract mismatches.

---

## Production Build

```bash
npm run build
```

This runs `anza build`. Same graph resolution, but starts from a clean `dist/` and fails on unresolved imports or syntax errors.

Public routes get **Mode A SSG** (also during `anza dev`): contentful HTML with open Declarative Shadow DOM under `dist/<route>/index.html`, so hard refresh works on a plain static server. Publish `dist/` as the **document root**. Asset URLs are site-root paths (`/app.js`, `/tokens/...`) — never `/dist/...`.

When the page’s CSR fragment path would collide with that SSG `index.html`, the emitter keeps the fragment as `template.html` and rewrites the built page module plus `routes.json` so soft-nav fetches the fragment — not the full document. Overview: [ssg/index.md](../ssg/index.md). Contract: [ssg/contract.md](../ssg/contract.md). Hydration: [ui/hydration.md](../ui/hydration.md).

### SEO extras (`ssg.json`)

Optional `ssg.json` next to (or inside) `src/` configures site origin and build-time SEO files:

```json
{
  "origin": "https://example.com",
  "siteName": "Anza"
}
```

- **`origin`** (or env `ANZA_SITE_ORIGIN`) — absolute canonicals, `og:url`, sitemap `<loc>`, and robots `Sitemap:`
- Always emits `dist/sitemap.xml` + `dist/robots.txt` for Mode A routes (unless disabled in `ssg.json`)
- Emits JSON-LD `WebSite` / `WebPage` in the SSG document `<head>` (light DOM; does not affect DSD hydration)

---

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

Validates required spine (`package.json`, `src/index.html`, `src/app.js`), recommended tokens/styles/SW/importmap, optional slots + index-per-folder barrels, optional `anza.json` (incl. `sw` string\|array), legacy `elements/` coexistence, undeclared page trees, and **via → dock** consistency (`rootDock` warn; unknown `via` error). Contract: [structure.md](structure.md) (single source of truth + Troubleshooting).

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

#### GitHub Pages

A [GitHub Pages project site](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#types-of-github-pages-sites) is served under `/<repository>/` (user/org sites use `owner.github.io` at `/`). Root-absolute browser URLs like `/styles/shared.css` resolve against the **domain** root ([URL standard](https://developer.mozilla.org/en-US/docs/Web/API/URL_API/Resolving_relative_references)), so they 404 on project Pages unless rewritten.

**`*.github.io/<repo>` (no custom domain):** set `"base": "/your-repo"` in `ssg.json` (next to or inside `src/`) or env `ANZA_BASE_PATH` so the build injects `globalThis.__ANZA_BASE__`, rewrites asset URLs in SSG HTML, and soft-nav style/template fetches hit `/your-repo/styles/...`. Publish `dist/` as the artifact **document root** — do not nest files under a `your-repo/` folder; Pages adds the repo prefix.

**Custom domain on the project:** Pages serves the site at the **domain root** (e.g. `https://anza.aduki.org/`), not under `/your-repo/` — see [About custom domains and GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages). Clear `base` / `ANZA_BASE_PATH` (omit or `""`) so assets resolve at `/styles/...`, `/app.js`, `/docs/...`. Include a `CNAME` in the published artifact when deploying via Actions.

**One-time repo setup:** Settings → Pages → Source: **GitHub Actions** (or your preferred Pages source).

Set canonical / sitemap origin in `ssg.json` (`origin`) or env `ANZA_SITE_ORIGIN` at build time.

---

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

---

## Flags

| Flag | Default | Description |
| ------ | ------- | ----------- |
| `-s, --src` | `src` | Source directory |
| `-p, --port` | `3000` | Dev server port |
| `--dist` | `dist` | Output directory |
| `-e, --entry` | `src/app.js` | Additional entry modules |
| `--strict` | off | With `doctor` — promote warnings to failures |
| `--tree` | first `pages[]` | With `generate page` — page tree under `src` |
| `--route` | `/{name}` | With `generate page` — route path |
| `--via` | `rootDock` | With `generate page` — comma-separated via chain |
| `--parent` | `rootDock` | With `generate dock` — parent registry key |

---

## Output

After `npm run build`:

```text
dist/
  index.html              # HTML with injected importmap link
  importmap.json         # Generated library mappings
  app.js                 # Entry and resolved dependencies
  sw.js                  # Service Worker entry with rewritten imports
  sw/                    # Copied SW library modules
  pages/
    index/
      index.js
      index.html
      index.css
  tokens/
    index.css
    ...
  styles/
    index.css
    ...
  types/
    index.d.ts           # Global HTMLElementTagNameMap augmentation
```

The folder structure inside `dist/` mirrors `src/`. Serve `dist/` as the site root; the browser resolves `/app.js` and friends natively (no `/dist` prefix).
