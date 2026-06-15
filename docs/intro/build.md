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
5. Watches `src/` for changes and rebuilds incrementally
6. Pushes HMR events via SSE

CSS files are hot-swapped. JS and HTML changes trigger a reload.

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

---

## Diagnostics

```bash
npx anza doctor
```

Checks your project for common issues: missing entry points, missing tokens/styles, conflicting layouts.

---

## Flags

| Flag | Default | Description |
| ------ | ------- | ----------- |
| `-s, --src` | `src` | Source directory |
| `-p, --port` | `3000` | Dev server port |
| `--dist` | `dist` | Output directory |
| `-e, --entry` | `src/app.js` | Additional entry modules |

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

The folder structure inside `dist/` mirrors `src/`. The browser resolves imports natively.
