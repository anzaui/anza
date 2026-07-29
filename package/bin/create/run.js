/**
 * bin/create/run.js
 *
 * Scaffold logic. Generates anza app files from templates.
 * Keep in sync with tools/src/create/run.rs.
 */

import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as logs from '../common/index.js';
import * as copy from './copy.js';
import * as write from './write.js';

const DIRS = [
  'src',
  'src/pages',
  'src/pages/entry',
  'src/docks',
  'src/views',
  'src/parts',
  'src/tokens',
  'src/styles',
];

const HTML = (name) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${name}</title>

    <script type="importmap" src="/importmap.json"></script>

    <link rel="stylesheet" href="/tokens/index.css" />
    <link rel="stylesheet" href="/styles/index.css" />

    <script type="module" src="/app.js"></script>
  </head>
  <body>
    <dock-main id="main"></dock-main>
  </body>
</html>
`;

const APP = `/**
 * src/app.js — app entry point
 *
 * Import order here is free-form. \`anza build\` rewrites static imports in
 * dist/ into usage order (library → docks → views → parts → pages).
 */
import '@adukiorg/anza/ui';
import { dock } from '@adukiorg/anza/ui';
import '@adukiorg/anza/theme';

import './docks/index.js';
import './views/index.js';
import './parts/index.js';
import './pages/index.js';

// Service Worker
navigator.serviceWorker.register('/sw.js', { type: 'module' });

// Layout shell
dock('main');
`;

const SW = `/**
 * src/sw.js — Service Worker entry
 *
 * Optional helpers live under src/sw/ (modules only — not extra registrations).
 */
import { precache, router, CacheFirst, NetworkFirst, pruneStale, claim } from '@adukiorg/anza/sw';

const SHELL = 'shell-v2';
const API = 'api-v2';

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      await precache(SHELL, ['/index.html', '/app.js', '/tokens/index.css', '/styles/index.css']);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([pruneStale(SHELL), claim()]));
});

const r = router();
r.register('*', new CacheFirst(SHELL));
r.register('/api/*', new NetworkFirst(API, { timeout: 3000 }));

self.addEventListener('fetch', (e) => {
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
`;

const PAGE = `/**
 * src/pages/entry/index.js — landing page
 */
import { page } from '@adukiorg/anza/ui';

page('/', {
  tag: 'page-welcome',
  via: ['main'],
  template: { html: './index.html', css: './index.css' }
}, import.meta.url);
`;

const PAGES_BARREL = `/**
 * src/pages/index.js
 *
 * Barrel — each meaningful folder should expose an index (convention).
 * Import page modules from this tree (and extra trees via their own barrels).
 */
import './entry/index.js';
`;

const DOCKS_BARREL = `/**
 * src/docks/index.js
 *
 * Barrel — import each dock module from this folder.
 * Co-located views under docks/ are organization only; custom element tags stay global.
 */
`;

const VIEWS_BARREL = `/**
 * src/views/index.js
 *
 * Barrel — optional global views slot (remap via anza.json \`views\`).
 * Co-location under docks/user trees is organization only — not a per-dock CE registry.
 */
`;

const PARTS_BARREL = `/**
 * src/parts/index.js
 *
 * Barrel — import each part module from this folder.
 */
`;

const MARKUP = (name) => `<article class="welcome">
  <h1>Welcome to ${name}</h1>
  <p>Your anza app is running.</p>
  <nav>
    <a href="https://github.com/aduki-org/anza" target="_blank" rel="noopener">Docs</a>
    <a href="https://github.com/aduki-org/anza/issues" target="_blank" rel="noopener">Issues</a>
  </nav>
</article>
`;

const STYLE = `.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-8);
  text-align: center;
  gap: var(--space-4);
}

.welcome h1 {
  font-size: var(--font-size-3xl);
  color: var(--color-content-primary);
}

.welcome p {
  font-size: var(--font-size-lg);
  color: var(--color-content-secondary);
}

.welcome nav {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.welcome nav a {
  color: var(--color-content-link);
  font-weight: var(--font-weight-medium);
}
`;

const IGNORE = 'node_modules/\ndist/\n.anzacache.json\n';

/** Omits anza.json on purpose — zero-config defaults. */
export function run(target, name, library) {
  if (existsSync(target)) {
    logs.error(`Target directory already exists: ${target}`);
    process.exit(1);
  }

  logs.info(`Scaffolding anza app: ${name}`);

  for (const dir of DIRS) {
    const path = join(target, dir);
    try {
      mkdirSync(path, { recursive: true });
    } catch (e) {
      logs.error(`Failed to create ${path}: ${e.message}`);
      process.exit(1);
    }
  }

  const libTokens = join(library, 'src', 'tokens');
  const libStyles = join(library, 'src', 'styles');
  const appTokens = join(target, 'src', 'tokens');
  const appStyles = join(target, 'src', 'styles');

  if (existsSync(libTokens)) {
    if (copy.copy(libTokens, appTokens)) {
      logs.compiler('Copied library tokens -> src/tokens/');
    }
  }

  if (existsSync(libStyles)) {
    if (copy.copy(libStyles, appStyles)) {
      logs.compiler('Copied library styles -> src/styles/');
    }
  }

  write.write(join(target, 'src', 'index.html'), HTML(name));
  write.write(join(target, 'src', 'app.js'), APP);
  write.write(join(target, 'src', 'sw.js'), SW);
  write.write(join(target, 'src', 'pages', 'entry', 'index.js'), PAGE);
  write.write(join(target, 'src', 'pages', 'entry', 'index.html'), MARKUP(name));
  write.write(join(target, 'src', 'pages', 'entry', 'index.css'), STYLE);
  write.write(join(target, 'src', 'pages', 'index.js'), PAGES_BARREL);
  write.write(join(target, 'src', 'docks', 'index.js'), DOCKS_BARREL);
  write.write(join(target, 'src', 'views', 'index.js'), VIEWS_BARREL);
  write.write(join(target, 'src', 'parts', 'index.js'), PARTS_BARREL);

  const manifest = JSON.stringify({
    name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'anza dev',
      build: 'anza build',
    },
    devDependencies: {
      '@adukiorg/anza': 'latest',
    }
  }, null, 2) + '\n';

  write.write(join(target, 'package.json'), manifest);
  write.write(join(target, 'importmap.json'), '{}\n');
  write.write(join(target, '.gitignore'), IGNORE);

  logs.success(`Created ${target}`);
  logs.info('Next steps:');
  logs.info(`  cd ${name}`);
  logs.info('  npm install');
  logs.info('  npm run dev');
}
