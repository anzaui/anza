<p align="center">
  <img src="logo.svg" width="64" height="64" alt="Anza Logo" />
</p>

<h1 align="center">Anza</h1>

Anza is a web UI toolkit built on standard browser features. It has four parts:

- **`@anzaui/anza`** (npm): the browser library. Custom elements, routing, state, storage, offline, animations and service worker helpers, all as plain ES modules.
- **`anza`** (CLI, Rust crate `anza-cli`): the dev server and static build. It is shipped with the npm package, so you run it as `npx anza …` or through `npm run …`.
- **`@anzaui/create-anza`** (npm): the project scaffolder behind `npm create @anzaui/anza`.
- **Server engines**: render full pages and signed JSON fragments from Rust (`anza` crate), TypeScript (`@anzaui/engine`) and Python (`anza` on PyPI). All three implement one [contract](docs/engines/contract.md): wire format v2 envelopes, `verify_envelope` with age and slot checks, an `escape` option, and keys validated at setup.

## Quick start

```bash
npm create @anzaui/anza myapp
cd myapp
npm install
npm run dev
```

Use `.` as the name to scaffold into the current directory. The scaffolder won't overwrite existing files unless you add `-- --force`.

The scaffold lists `rolldown` as a devDependency, so `npm run build` bundles. The dev server runs on `http://localhost:3000` and only accepts local requests; pass `--host 0.0.0.0` to reach it from another device. The full walkthrough is in [docs/intro/start.md](docs/intro/start.md).

## A page and an element

```javascript
import { dock, page, view } from '@anzaui/anza/ui';

dock('main'); // renders as <dock-main>

view('hello-card', {
  props: { name: { type: String, default: 'world' } },
  template: '<p>Hello, <span ref="name"></span>!</p>',
  on: {
    connect({ el, refs }) { refs.name.textContent = el.name; }
  }
});

page('/', {
  tag: 'page-home',
  via: ['main'],
  template: '<hello-card name="Anza"></hello-card>'
});
```

Components are defined with `element()`, `view()`, `part()`, `dock()` and `page()`. There are no classes to extend. Built-in elements use `ui-*` tags, docks use `dock-<name>`.

## CLI

| Command | What it does |
| ------- | ------------ |
| `npx anza dev` | Dev server with live reload on `127.0.0.1:3000` (`--port`, `--host 0.0.0.0` for the LAN; `npm run dev` in a scaffolded app) |
| `npx anza build` | Production build into `dist/` (`npm run build`). Fails on errors. Writes static HTML per public route, Rolldown chunks under `assets/` (needs the `rolldown` devDependency; `--no-bundle` to skip), `404.html`, `_headers`, and a sitemap with `<lastmod>`. Pages get OG, Twitter and JSON-LD tags |
| `npx anza check` | Strict project structure check for CI; warnings fail |
| `npx anza doctor` | Same checks as `check`, but warnings only print |
| `npx anza scan` | Extract element metadata and type declarations |
| `npx anza generate <page\|dock\|view\|part> <name>` | Create a file in the right folder and update its barrel |
| `npx anza docs` | Build a docs site from Markdown (`--out`, `--all`), or with `--pages` the app's docs page folders |

`anza create` only prints a hint: new projects are created with `npm create @anzaui/anza <name>`.

## Documentation

- [Getting started](docs/intro/start.md) and [project structure](docs/intro/structure.md)
- [UI](docs/ui/index.md), [router](docs/router/index.md), [state](docs/state/index.md), [storage](docs/storage/index.md), [service worker](docs/sw/index.md)
- [Built-in elements](docs/elements/index.md)
- [Server engines](docs/engines/index.md)
- Package READMEs: [library](library/README.md), [create](create/README.md), [Rust engine](engines/rust/README.md), [TS engine](engines/ts/README.md), [Python engine](engines/py/README.md)

## Repository

| Path | Contents |
| ---- | -------- |
| `library/` | `@anzaui/anza` |
| `create/` | `@anzaui/create-anza` |
| `tools/` | The `anza` CLI (Rust crate `anza-cli`) |
| `engines/` | Server engines (Rust, TypeScript, Python) |
| `docs/` | Documentation source |
| `web/` | The Anza website, built with Anza |

Checks: `npm run check` (types), `npm test` (browser tests), `npm run doc:imports`, `npm run types:check`.

## License

MIT © 2026 aduki, Labs
