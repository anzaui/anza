# Page HTML contract (Mode A SSG · Mode B templates)

Normative shape for every public, indexable HTML response. **Mode A** (`anza build` SSG) and **Mode B** (any-language request-time templates) must emit this same contract so client hydration has one adoption path.

Sibling: the **folder** contract (required / recommended / optional project slots, optional `anza.json`) lives in [intro/structure.md](../intro/structure.md).

Overview of Phases 0–6: [index.md](index.md). Client adopt details: [ui/hydration.md](../ui/hydration.md).

Golden samples: [plans/fixtures/ssg/](../../plans/fixtures/ssg/). Planning context: [plans/SSG-SEO.md](../../plans/SSG-SEO.md).

---

## Site-root asset URLs

Production treats `dist/` as the **document root**. Public asset URLs never include a `/dist` prefix.

| Correct | Incorrect |
| -------- | ---------- |
| `/app.js` | `/dist/app.js` |
| `/importmap.json` | `/dist/importmap.json` |
| `/tokens/index.css` | `/dist/tokens/index.css` |
| `/styles/index.css` | `/dist/styles/index.css` |
| `/docs/intro/start/index.js` | `/dist/docs/...` |

Import map `imports` values follow the same rule (site-root paths only).

---

## Required `<head>`

Emit in this order (charset/viewport first; import map before any `type="module"` entry):

1. **Charset + viewport** — `<meta charset="utf-8">`, viewport meta.
2. **`<title>`** — unique per route (SEO title, else H1 text, else path-derived).
3. **Meta description** — unique per route.
4. **Canonical** — `link rel="canonical"` (path or absolute URL when origin is set).
5. **Optional social** — `og:title`, `og:description`, `og:url`, `twitter:card`.
6. **JSON-LD** (Mode A default) — light-DOM `WebSite` + `WebPage` via `ssg.json` `jsonLd` (does not touch DSD).
7. **Import map** — inline `<script type="importmap">…</script>` preferred; else `src="/importmap.json"`. Must appear **before** module scripts.
8. **Critical CSS** — at least:
   - `<link rel="stylesheet" href="/tokens/index.css" />`
   - `<link rel="stylesheet" href="/styles/index.css" />`
9. **Route-scoped `modulepreload`** — `/app.js`, then via-dock modules, layouts, and the leaf page module (from `routes.json`).
10. **Deferred entry** — `<script type="module" src="/app.js"></script>` (or the route entry). Not blocking first paint beyond parser work; DSD paints without waiting on the full ESM graph.

---

## Required `<body>`

### Via-chain nesting

Walk the route’s `via` chain (outer → inner) and nest custom elements so the leaf page sits inside its docks. Example for `/docs/intro/start` with `via: ["main", "docs", "content"]` (registry key `content`, custom element tag `dock-doccontent`):

```html
<body>
  <dock-main id="main">
    <template shadowrootmode="open">…</template>
    <dock-docs>
      <template shadowrootmode="open">…</template>
      <dock-doccontent>
        <template shadowrootmode="open">…</template>
        <page-…>
          <template shadowrootmode="open">…</template>
          <!-- optional light-DOM critical text -->
        </page-…>
      </dock-doccontent>
    </dock-docs>
  </dock-main>
</body>
```

- `dock-main` (or the root dock named `main`) SHOULD carry `id="main"`.
- Each custom element that owns encapsulated UI includes an open Declarative Shadow DOM template as a direct child.
- **Light-DOM nesting (required):** nested hosts (`dock-docs`, `dock-doccontent`, leaf page) MUST be **light-DOM children** of their parent host — siblings **after** that parent's `<template shadowrootmode="open">`, never inside it. Shadow + `<slot>` only projects light-DOM children; hosts baked into a parent shadow template will not slot, and cascade adopt (which walks `parent.children`) will miss them and wipe SSG on hard refresh.
- Registry keys in `via` are `main` / `docs` / `content`; custom element tags are `dock-main` / `dock-docs` / `dock-doccontent` (not `dock-content`).
- Leaf (and layout) template HTML/CSS are inlined into DSD so first paint does not wait on template fetches.
- `/` nests the page leaf under `dock-main` only (no docs chrome).

### Open-only Declarative Shadow DOM

Public / indexable markup MUST use:

```html
<template shadowrootmode="open">
```

`shadowrootmode="closed"` is **banned** for public content. Closed shadow prevents adoption-based hydration and weakens observability for tooling and some crawlers.

### Light-DOM critical text (recommendation)

Prefer also exposing the primary heading (and, where practical, a short lead) as **light-DOM** children of the leaf page element (outside the shadow template), e.g. `<h1>…</h1>`. That keeps critical words visible in View Source / curl even for agents that mishandle shadow trees. Encapsulated copy inside open DSD remains the visual source of truth after paint.

---

## Same HTML for all user agents

No cloaking. The same URL returns the same contentful HTML for browsers, `curl`, and crawler UAs. Do **not** branch on `User-Agent` to serve SSR to bots and an empty SPA shell to humans.

---

## Mode A vs Mode B

| Mode | When | Who emits | Must emit |
| ------ | ------ | ---------- | ---------- |
| **A — SSG** | `anza build` and `anza dev` | Anza SSG emitter | This contract into `dist/<route>/index.html` |
| **B — Templates** | Request time | Jinja / EJS / HBS / Go / … | **This same shape**; static assets still served from `dist/` as site root |

Mode B servers MUST NOT require an Anza Node SSR runtime. Templates + static files are enough. Auth / personalized routes may stay CSR or Mode B with `noindex` as appropriate — never UA-branch for indexing.

### Parametric routes (Mode A expansion)

Public paths with `:param` (or `*`) are **not** SSG’d by default — `routes.json` keeps `ssg: false` so the client can still match them (Mode B or CSR). To emit Mode A HTML for concrete values, declare a build-time expansion:

**In the page module** (`page({ ssg: { expand: […] } })`):

```javascript
page('/docs/ssg/expand/:slug', {
  params: [{ name: 'slug', type: String }],
  ssg: {
    expand: [
      { slug: 'foo' },
      // or shorthand when there is a single param: 'foo'
      // or a full concrete path: '/docs/ssg/expand/foo'
    ]
  },
  seo: {
    title: 'SSG expand: {{slug}} — Anza',
    description: 'Example for {{slug}}'
  },
  // …
});
```

**Or project-level** `ssg.params.json` next to `src/` (or inside `src/`):

```json
{
  "/docs/ssg/expand/:slug": [{ "slug": "foo" }]
}
```

Rules:

| Case | Result |
| ------ | -------- |
| Parametric + listed in `expand` / `ssg.params.json` | Concrete path in `routes.json` with `ssg: true`; `dist/<path>/index.html` emitted; `{{param}}` interpolated in SEO and page HTML |
| Parametric + **no** expansion | Pattern stays `ssg: false`; **no** SSG file (use Mode B templates or leave CSR) |
| Personalized / auth params | Prefer Mode B or CSR — do not force-guess expansions |

Live fixture: [`/docs/ssg/expand/foo`](/docs/ssg/expand/foo) (pattern `/docs/ssg/expand/:slug`).

### Site origin, sitemap, robots, JSON-LD

Optional project file `ssg.json` next to `src/` (or inside `src/`):

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
| ------ | -------- |
| `origin` | Absolute site origin (no trailing slash). When set, canonical / `og:url` / sitemap `<loc>` / robots `Sitemap:` become absolute. Override with env `ANZA_SITE_ORIGIN`. Without origin, path-relative URLs are used (fine for local/static preview). |
| `siteName` | JSON-LD `WebSite.name` (default `Anza`) |
| `jsonLd` | Emit light-DOM `<script type="application/ld+json">` with `WebSite` + `WebPage` (default `true`) — does not touch DSD |
| `sitemap` / `robots` | Write `dist/sitemap.xml` and `dist/robots.txt` for Mode A SSG routes (default `true`) |

### Soft-nav fragments vs SSG documents

Hard refresh / full load serves the SSG (or Mode B) document above. Soft-nav must **not** fetch that full document as a page template — it would nest docks inside the leaf shadow (stacked chrome). When the page fragment path collides with `dist/<route>/index.html`, Mode A preserves the CSR fragment as `template.html` and rewrites the dist page module + `routes.json` to point at it. The client also refuses full HTML documents as page templates (`sanitizeTemplateHtml`).

---

## Minimal checklist (CI / review)

- [ ] `<title>` and meta description present and route-unique
- [ ] Import map before `<script type="module" src="/app.js">`
- [ ] `/tokens/index.css` and `/styles/index.css` linked
- [ ] At least one `rel="modulepreload"` for `/app.js` (plus route modules)
- [ ] Via-chain custom elements with nested open DSD
- [ ] Zero `shadowrootmode="closed"` (contract check scans all SSG `index.html` under `dist/`)
- [ ] Zero `/dist/` prefixes on `href` / `src` asset URLs
- [ ] Primary heading text present in the HTML body (DSD and/or light DOM)
- [ ] `dist/sitemap.xml` + `dist/robots.txt` present after build
- [ ] JSON-LD `WebPage` present on Mode A pages (when `jsonLd` enabled)

Run the lightweight checker from the repo root:

```bash
node tasks/ssg-contract-check.js
# optional rebuild:
node tasks/ssg-contract-check.js --rebuild
```
