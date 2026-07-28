# Page HTML contract (Mode A SSG · Mode B templates)

Normative shape for every public, indexable HTML response. **Mode A** (`anza build` SSG) and **Mode B** (any-language request-time templates) must emit this same contract so client hydration has one adoption path. Client adopt details: [ui/hydration.md](../ui/hydration.md).

Golden samples: [plans/fixtures/ssg/](../../plans/fixtures/ssg/). Planning context: [plans/SSG-SEO.md](../../plans/SSG-SEO.md) Phase 3.

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
4. **Canonical** — `link rel="canonical"` (path or absolute URL).
5. **Optional social** — `og:title`, `og:description`, `og:url`, `twitter:card` (and further OG/Twitter/JSON-LD as needed).
6. **Import map** — inline `<script type="importmap">…</script>` preferred; else `src="/importmap.json"`. Must appear **before** module scripts.
7. **Critical CSS** — at least:
   - `<link rel="stylesheet" href="/tokens/index.css" />`
   - `<link rel="stylesheet" href="/styles/index.css" />`
8. **Route-scoped `modulepreload`** — `/app.js`, then via-dock modules, layouts, and the leaf page module (from `routes.json`).
9. **Deferred entry** — `<script type="module" src="/app.js"></script>` (or the route entry). Not blocking first paint beyond parser work; DSD paints without waiting on the full ESM graph.

---

## Required `<body>`

### Via-chain nesting

Walk the route’s `via` chain (outer → inner) and nest custom elements so the leaf page sits inside its docks. Example for `/docs/intro/start` with `via: ["main", "docs", "content"]`:

```html
<body>
  <dock-main id="main">
    <template shadowrootmode="open">…</template>
    <dock-docs>
      <template shadowrootmode="open">…</template>
      <dock-content>
        <template shadowrootmode="open">…</template>
        <page-…>
          <template shadowrootmode="open">…</template>
          <!-- optional light-DOM critical text -->
        </page-…>
      </dock-content>
    </dock-docs>
  </dock-main>
</body>
```

- `dock-main` (or the root dock named `main`) SHOULD carry `id="main"`.
- Each custom element that owns encapsulated UI includes an open Declarative Shadow DOM template as a direct child.
- Leaf (and layout) template HTML/CSS are inlined into DSD so first paint does not wait on template fetches.

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
| **A — SSG** | `anza build` | Anza SSG emitter | This contract into `dist/<route>/index.html` |
| **B — Templates** | Request time | Jinja / EJS / HBS / Go / … | **This same shape**; static assets still served from `dist/` as site root |

Mode B servers MUST NOT require an Anza Node SSR runtime. Templates + static files are enough. Auth / personalized routes may stay CSR or Mode B with `noindex` as appropriate — never UA-branch for indexing.

---

## Minimal checklist (CI / review)

- [ ] `<title>` and meta description present and route-unique
- [ ] Import map before `<script type="module" src="/app.js">`
- [ ] `/tokens/index.css` and `/styles/index.css` linked
- [ ] At least one `rel="modulepreload"` for `/app.js` (plus route modules)
- [ ] Via-chain custom elements with nested open DSD
- [ ] Zero `shadowrootmode="closed"`
- [ ] Zero `/dist/` prefixes on `href` / `src` asset URLs
- [ ] Primary heading text present in the HTML body (DSD and/or light DOM)

Run the lightweight checker from the repo root:

```bash
node tasks/ssg-contract-check.js
# optional rebuild:
node tasks/ssg-contract-check.js --rebuild
```
