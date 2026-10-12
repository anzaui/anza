# @anzaui/create-anza

Creates a new Anza app. It runs the scaffolder that ships with `@anzaui/anza` (`@anzaui/anza/bin/create`).

```bash
npm create @anzaui/anza myapp
cd myapp
npm install
npm run dev
```

Use `.` as the name to scaffold into the current directory:

```bash
npm create @anzaui/anza .
```

The scaffolder never overwrites files by default. If any file it would write already exists, it lists them and exits with an error. To overwrite them, pass `--force` after `--`:

```bash
npm create @anzaui/anza myapp -- --force
```

Generated layout: `src/index.html`, `src/app.js`, `src/sw.js`, `src/pages/entry/` (landing page: `index.js`, `index.html`, `index.css`), `src/docks/main/` (the `main` dock), barrels `src/{pages,docks,views,parts}/index.js`, starter `src/tokens/` and `src/styles/`, plus `package.json` (`dev` and `build` scripts; devDependencies `@anzaui/anza` and `rolldown`), `importmap.json` and `.gitignore`. No `anza.json` is needed.

Docs: [getting started](https://github.com/anzaui/anza/blob/main/docs/intro/start.md).

MIT © 2026 aduki, Labs
