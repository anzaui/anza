# SSG golden fixtures (Mode A)

Checked-in HTML produced by **Mode A** (`anza build` SSG). These are the canonical expected shape for the [Page HTML contract](../../../docs/ssg/contract.md). Mode B template servers should emit the same structure (meta, open DSD via-chain, site-root asset URLs).

| File | Source route | Built from |
| ------ | ------------ | ---------- |
| `home.html` | `/` | `web/dist/index.html` |
| `docs-intro-start.html` | `/docs/intro/start` | `web/dist/docs/intro/start/index.html` |

## Refresh

```bash
cd web && npm run build
cp dist/index.html ../plans/fixtures/ssg/home.html
cp dist/docs/intro/start/index.html ../plans/fixtures/ssg/docs-intro-start.html
```

## Contract check

From repo root:

```bash
node tasks/ssg-contract-check.js
```

Use `--rebuild` to run `web`’s `npm run build` first.
