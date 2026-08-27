# @anzaui/create-anza

Scaffold a new anza app with one command.

## Usage

```bash
npm create @anzaui/anza myapp
cd myapp
npm install
npm run dev
```

This generates a complete project with:

- `src/app.js` — entry point with UI init, theme, and Service Worker
- `src/index.html` — HTML shell with importmap, tokens, and styles
- `src/sw.js` — Service Worker with caching strategies
- `src/pages/index/` — welcome page (JS, HTML, CSS)
- `src/tokens/` — design tokens copied from the library
- `src/styles/` — global styles copied from the library

## What it does

`npm create @anzaui/anza` installs this package, which resolves the installed `@anzaui/anza` library and delegates to its scaffold logic. The library handles the actual file generation — this package is just the entry point.

## Programmatic use

```javascript
import { run } from '@anzaui/anza/bin/create';

run('/path/to/myapp', 'myapp', '/path/to/@anzaui/anza');
```

## License

MIT © Aduki
