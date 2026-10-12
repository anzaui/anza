---
title: "SSG & SEO"
order: 5
seo_title: "SSG & SEO — Anza"
description: "Mode A/B SSG overview: site-root dist, open DSD, page SEO fields, ssg.json, 404 page, sitemap and parametric expand."
---

# SSG & SEO

Anza ships **contentful HTML** for public routes so hard refresh and crawlers see unique meta, open Declarative Shadow DOM, and primary headings **without executing JS**. There is no Anza-owned production SSR runtime — Mode A emits HTML at build time; Mode B templates in any language emit the same shape at request time.

Portable rule: treat `dist/` as the **site root**. Public URLs are `/app.js`, `/importmap.json`, `/docs/...` — never `/dist/...`.

Client adopt: [Hydration (DSD adopt)](../ui/hydration.md). Normative markup: [Page HTML contract (Mode A SSG · Mode B templates)](contract.md).

## Modes

| Mode | When | Who emits HTML | Assets |
| ---- | ---- | -------------- | ------ |
| **A — Pure static** | `anza build` / `anza dev` | SSG emitter → `dist/<route>/index.html` | `dist/` as site root |
| **B — Any-lang templates** | Request time | Jinja / EJS / HBS / Go / Node / … | Same `dist/` static files |

Both modes must satisfy the [page HTML contract](contract.md) so hydration has one adoption path. Goldens: `tools/fixtures/ssg/`. Check output with `node tasks/ssg-contract-check.js` (see [Verify](#verify)).

## Unknown URLs (404)

`anza build` writes `dist/404.html`: the app shell titled `Page not found — {siteName}` and marked `noindex`. Serve it with status 404 for unknown paths so crawlers see no soft 404s. `anza dev` and the site's `web/worker.js` already do this. The worker still answers paths that match a client-only route in `routes.json` (`/users/:id`) with the app shell, and redirects `/x/` and `/x/index` to `/x` (301). Once the client boots, [Fallbacks (404 / 5xx / offline)](../router/fallbacks.md) paints the not-found leaf inside the **leaf** dock (library built-in, or a dock/page override).

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

The build reads `seo` from the source without running it, so values must be string literals.

| Field | Effect | Default |
| ----- | ------ | ------- |
| `title` | `<title>`, `og:title`, `twitter:title`, JSON-LD name | `"{H1} — {Section} — {siteName}"` (below) |
| `description` | Meta, `og:` and `twitter:` description | The first paragraph |
| `canonical` | `<link rel="canonical">` and `og:url` | The route path |
| `image` | `og:image` and `twitter:image` | The site `image` in `ssg.json` |

After `anza build`, `dist/docs/intro/start/index.html` is curl-readable (unique `<title>`, open DSD, primary heading). Soft-nav between docs pages fetches the CSR fragment (`template.html` when needed), not that full document.

## Advanced: expand, origin, sitemap

### Parametric expand

```javascript
page('/docs/ssg/expand/:slug', {
  tag: 'doc-ssg-expand',
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

Or project-level `ssg.params.json`. The build replaces `{{slug}}` in `seo` strings and the page HTML (this is build-time substitution, not UI template syntax). The pattern stays `ssg: false`; each expansion emits a concrete `ssg: true` route. Live fixture: [`/docs/ssg/expand/foo`](/docs/ssg/expand/foo). Details: [Page HTML contract (Mode A SSG · Mode B templates)](contract.md).

### Site origin + SEO artifacts

`ssg.json` next to (or inside) `src/`:

```json
{
  "origin": "https://example.com",
  "siteName": "Anza",
  "jsonLd": true,
  "sitemap": true,
  "robots": true,
  "image": "/og.png"
}
```

| Field | Effect |
| ----- | ------ |
| `origin` | Absolute canonical / `og:url` / sitemap `<loc>` (override: `ANZA_SITE_ORIGIN`) |
| `siteName` | `og:site_name`, the title suffix and JSON-LD `WebSite.name` (default `Anza`) |
| `jsonLd` | Light-DOM JSON-LD `@graph`: `WebSite`, `WebPage`, `BreadcrumbList`, and `TechArticle` for `/docs/*` pages (default on) |
| `sitemap` / `robots` | Write `dist/sitemap.xml` (with `<lastmod>`) and `dist/robots.txt` |
| `image` | Default `og:image` / `twitter:image` for pages without `seo.image` (site-root path or URL, 1200×630). A site-root file in `src/` is copied to `dist/` |

Each page's `<title>` is `seo.title` when the page declares one, else `"{H1} — {Section} — {siteName}"`, where the section is the H1 of the parent page for pages three or more path segments deep (`/docs/intro/start`). Repeated parts are dropped. A section's index page lives at `/docs/<section>`, not `/docs/<section>/index`. The description is `seo.description`, else the first paragraph cut at a word boundary (155 characters); short or repeated ones get the section name in front, and the build warns about any description still shared by several pages. Sitemap `<lastmod>` is the last git commit date of the page's HTML, module and CSS, or the file modification time outside git.

Without `origin`, path-relative URLs are fine for local preview; sitemap locs stay site-root paths.

## Soft-nav coexistence

Hard refresh serves the SSG (or Mode B) document. Soft-nav must **not** use that document as a page template — nested docks would stack inside the leaf shadow. Mode A preserves the CSR fragment as `template.html` when paths collide, and the client `sanitizeTemplateHtml` refuses full HTML documents. Nested hosts must be light-DOM children **after** each parent’s `<template shadowrootmode="open">`.

Project layout (folders, `anza.json`, doctor/check) is a separate contract: [Structure](../intro/structure.md). Fallbacks after CSR miss are leaf-scoped: [Fallbacks (404 / 5xx / offline)](../router/fallbacks.md).

## Verify

```bash
rm -rf dist && npm run build   # or anza build from web/
cd dist && python3 -m http.server 8000
curl -s http://127.0.0.1:8000/docs/intro/start/ | grep -E '<h1|<title'
node tasks/ssg-contract-check.js          # goldens + nest + closed-DSD /dist gates
node tasks/ssg-contract-check.js --rebuild
```

Same contentful HTML for every User-Agent — no cloaking.

## File map

| File | What it covers |
| ---- | -------------- |
| [Page HTML contract (Mode A SSG · Mode B templates)](contract.md) | Normative head/body, Mode A/B, expand, origin/sitemap/JSON-LD, checklist |
| [Hydration (DSD adopt)](../ui/hydration.md) | Client adopt / soft-nav vs hard refresh |
| Fixture expand page | [`/docs/ssg/expand/foo`](/docs/ssg/expand/foo) |
