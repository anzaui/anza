# SSG & SEO

Anza ships **contentful HTML** for public routes so hard refresh and crawlers see unique meta, open Declarative Shadow DOM, and primary headings **without executing JS**. There is no Anza-owned production SSR runtime — Mode A emits HTML at build time; Mode B templates in any language emit the same shape at request time.

Portable rule: treat `dist/` as the **site root**. Public URLs are `/app.js`, `/importmap.json`, `/docs/...` — never `/dist/...`.

Planning track (Phases 0–6): [plans/SSG-SEO.md](../../plans/SSG-SEO.md). Client adopt: [ui/hydration.md](../ui/hydration.md). Normative markup: [contract.md](contract.md).

## Modes

| Mode | When | Who emits HTML | Assets |
| ---- | ---- | -------------- | ------ |
| **A — Pure static** | `anza build` / `anza dev` | SSG emitter → `dist/<route>/index.html` | `dist/` as site root |
| **B — Any-lang templates** | Request time | Jinja / EJS / HBS / Go / Node / … | Same `dist/` static files |

Both modes must satisfy the [page HTML contract](contract.md) so hydration has one adoption path. Examples: `examples/mode-b-python/`, `examples/mode-b-go/`, `examples/mode-b-node/`. Goldens: `plans/fixtures/ssg/`.

## What shipped (Phases 0–6)

| Phase | Outcome |
| ----- | ------- |
| **0** | Portable site-root assets — import map and routes without `/dist` prefixes; serve with `cd dist && python3 -m http.server` |
| **1** | Mode A SSG HTML per public route — title/meta, open DSD, modulepreload, deferred `/app.js` |
| **2** | Client DSD **adopt** (no wipe) — rehydrate refs / tags / `on` / `watch`; soft-nav leaf swap |
| **3** | Mode B contract + goldens + Python/Go/Node examples + `tasks/ssg-contract-check.js` |
| **4** | Nested docks as **light-DOM siblings after** each open DSD template; CSR `template.html` when SSG collides with the page fragment path; soft-nav must not fetch full SSG documents as templates |
| **5** | Parametric expand — `page({ ssg: { expand } })` / `ssg.params.json`; unexpanded patterns stay `ssg: false` |
| **6** | `ssg.json` / `ANZA_SITE_ORIGIN` — absolute canonicals, `sitemap.xml` / `robots.txt`, JSON-LD WebSite/WebPage, corpus contract gate |

There is **no Phase 7**. Residual host polish (Worker preferring SSG over SPA fallback) is optional and not product acceptance.

**CSR fallbacks:** unknown paths may get a host `404` body or SPA shell HTML. Once the client boots, [router/fallbacks.md](../router/fallbacks.md) paints a not-found / error leaf inside the **leaf** dock (shared library built-in, or a dock/page override) — separate from Mode A SSG emission. Do not bake a `404.html` into every dock folder.

## Simple: Mode A page SEO

```javascript
page('/docs/intro/start', {
  tag: 'doc-intro-start',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  seo: {
    title: 'Getting Started — Anza',
    description: 'Scaffold and run your first Anza app.'
  }
}, import.meta.url);
```

After `anza build`, `dist/docs/intro/start/index.html` is curl-readable (unique `<title>`, open DSD, primary heading). Soft-nav between docs pages fetches the CSR fragment (`template.html` when needed), not that full document.

## Advanced: expand, origin, sitemap

### Parametric expand (Phase 5)

```javascript
page('/docs/ssg/expand/:slug', {
  params: [{ name: 'slug', type: String }],
  ssg: {
    expand: [{ slug: 'foo' }]
  },
  seo: {
    title: 'SSG expand: {{slug}} — Anza',
    description: 'Example for {{slug}}'
  }
}, import.meta.url);
```

Or project-level `ssg.params.json`. Pattern stays `ssg: false`; each expansion emits a concrete `ssg: true` route. Live fixture: [`/docs/ssg/expand/foo`](/docs/ssg/expand/foo). Details: [contract.md](contract.md).

### Site origin + SEO artifacts (Phase 6)

`ssg.json` next to (or inside) `src/`:

```json
{
  "origin": "https://example.com",
  "siteName": "Anza",
  "jsonLd": true,
  "sitemap": true,
  "robots": true
}
```

| Field | Effect |
| ----- | ------ |
| `origin` | Absolute canonical / `og:url` / sitemap `<loc>` (override: `ANZA_SITE_ORIGIN`) |
| `jsonLd` | Light-DOM `WebSite` + `WebPage` JSON-LD (default on) |
| `sitemap` / `robots` | Write `dist/sitemap.xml` and `dist/robots.txt` |

Without `origin`, path-relative URLs are fine for local preview; sitemap locs stay site-root paths.

## Soft-nav coexistence (Phase 4)

Hard refresh serves the SSG (or Mode B) document. Soft-nav must **not** use that document as a page template — nested docks would stack inside the leaf shadow. Mode A preserves the CSR fragment as `template.html` when paths collide, and the client `sanitizeTemplateHtml` refuses full HTML documents. Nested hosts must be light-DOM children **after** each parent’s `<template shadowrootmode="open">`.

Project layout (folders, `anza.json`, doctor/check) is a separate contract: [intro/structure.md](../intro/structure.md). Fallbacks after CSR miss are leaf-scoped: [router/fallbacks.md](../router/fallbacks.md).

## Verify

```bash
rm -rf dist && npm run build   # or anza build from web/
cd dist && python3 -m http.server PORT
curl -s http://127.0.0.1:PORT/docs/intro/start/ | grep -E '<h1|<title'
node tasks/ssg-contract-check.js          # goldens + nest + closed-DSD /dist gates
node tasks/ssg-contract-check.js --rebuild
```

Same contentful HTML for every User-Agent — no cloaking.

## File map

| File | What it covers |
| ---- | -------------- |
| [contract.md](contract.md) | Normative head/body, Mode A/B, expand, origin/sitemap/JSON-LD, checklist |
| [ui/hydration.md](../ui/hydration.md) | Client adopt / soft-nav vs hard refresh |
| Fixture expand page | [`/docs/ssg/expand/foo`](/docs/ssg/expand/foo) |
