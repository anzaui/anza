# Anza

> The browser already knows how to render, route, cache, and animate. We just stopped getting in its way.

Anza gives the browser a gentle nudge — reactive state, view transitions, offline caching, and custom elements without a build step. Just import and ship.

## Structure

| Folder | Contents |
| ------ | -------- |
| `library/` | Runtime library and custom elements (`@adukiorg/anza`) |
| `tools/` | Rust CLI for dev server, build, and type extraction |
| `tasks/` | Repo automation scripts |
| `docs/` | Full documentation |

## Build

The CLI is a Rust binary. To compile it:

```bash
node tasks/build.js
```

This writes the release binary to `tools/target/release/anza`.

## Develop

```bash
cd library
npm install
npm test     # real-browser tests via @web/test-runner
```

## Docs site

Build the static docs app (same command CI uses):

```bash
node tasks/build.js          # compile CLI once
cd web && npm ci && npm run build
```

Output: `web/dist/`. CI deploys to GitHub Pages on push to `main`.

## Release

Tag push `v*.*.*` triggers multi-platform CLI builds, npm publish, and a GitHub Release with attached binaries. Tag version must match `library/package.json`. Details: [.github/RELEASING.md](./.github/RELEASING.md).

## License

[MIT](./LICENSE) © 2026 Aduki
