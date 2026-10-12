# @anzaui/anza

[![npm](https://img.shields.io/npm/v/@anzaui/anza)](https://www.npmjs.com/package/@anzaui/anza)
[![license](https://img.shields.io/npm/l/@anzaui/anza)](./LICENSE)

A browser-native web UI library: custom elements, routing, state, storage,
offline sync, animations and service worker helpers, as plain ES modules. It
also ships the `anza` CLI (dev server and static build).

## Install

Start a new app (recommended):

```bash
npm create @anzaui/anza myapp
cd myapp
npm install
npm run dev
```

Use `.` as the name to scaffold into the current directory. Existing files
are never overwritten unless you add `-- --force`.

Or add it to an existing project:

```bash
npm install --save-dev @anzaui/anza
npx anza dev
```

`anza build` bundles production output into `dist/assets/` chunks with
Rolldown when your project has it (`npm install -D rolldown`); otherwise it
ships unbundled modules. It fails on errors, and writes static HTML for public
routes, `404.html`, `_headers` and a sitemap with `<lastmod>`, with OG,
Twitter and JSON-LD tags on every page.

`anza dev` listens on `127.0.0.1:3000` and answers local requests only. Use
`anza dev --host 0.0.0.0` to test from another device.

## Example

```javascript
import { dock, page, view } from '@anzaui/anza/ui';

dock('main'); // <dock-main>

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

Components are defined with `element()`, `view()`, `part()`, `dock()` and
`page()`, never with classes. Built-in elements (`ui-*`) come from
`@anzaui/anza/elements`.

## Entry points

`@anzaui/anza` re-exports the core modules. Each one is also a subpath:
`/api`, `/state`, `/events`, `/router`, `/storage`, `/offline`,
`/animations`, `/workers`, `/security`, `/platform`, `/ui`, `/defs`, `/theme`,
`/sw`, `/elements` and `/elements/<name>`, plus CSS under `/tokens/*` and
`/styles/*`. Types are included for every JS entry point.

The `/sw` helpers never cache `no-store` or `private` responses, `Vary: *`,
requests with an `Authorization` header, or credentialed cross-origin
requests. The `/security` sanitizer keeps only `http`, `https` and `mailto`
URLs and drops `id` and `style` attributes.

## Documentation

Full docs: <https://github.com/anzaui/anza/tree/main/docs>
([getting started](https://github.com/anzaui/anza/blob/main/docs/intro/start.md)).

Changes are listed in [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE) © 2026 aduki, Labs
