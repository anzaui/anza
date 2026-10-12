/**
 * bin/create/run.js
 *
 * Scaffold logic. Generates anza app files from templates.
 * The only scaffolder: `anza create` just points to `npm create @anzaui/anza`.
 */

import { join, relative } from 'path';
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import * as logs from '../common/index.js';
import * as copy from './copy.js';
import * as write from './write.js';

const DIRS = [
  'src',
  'src/pages',
  'src/pages/entry',
  'src/docks',
  'src/docks/main',
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
import '@anzaui/anza/ui';
import '@anzaui/anza/theme';

import './docks/index.js';
import './views/index.js';
import './parts/index.js';
import './pages/index.js';

// Service Worker: real hosts only. On local hosts, remove workers and caches
// left over from earlier builds so the dev server never serves stale files.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
if ('serviceWorker' in navigator) {
  if (LOCAL_HOSTS.has(location.hostname)) {
    navigator.serviceWorker
      .getRegistrations()
      .then(async (regs) => {
        if (!regs.length) return;
        await Promise.all(regs.map((reg) => reg.unregister()));
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      })
      .catch(() => {});
  } else {
    navigator.serviceWorker.register('/sw.js', { type: 'module' });
  }
}
`;

const SW = `/**
 * src/sw.js — Service Worker entry
 *
 * Optional helpers live under src/sw/ (modules only — not extra registrations).
 */
import { precache, router, CacheFirst, NetworkFirst, StaleRevalidate, claim } from '@anzaui/anza/sw';

// Bump these names when shipping path-breaking asset changes; activate drops
// every other cache.
const SHELL = 'shell-v1';
const API = 'api-v1';
const KEEP = new Set([SHELL, API]);

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      // \`anza build\` writes the list of hashed files (self.__ANZA_PRECACHE__);
      // an unbuilt worker falls back to the unhashed shell.
      const shell = self.__ANZA_PRECACHE__ ?? ['/index.html', '/app.js', '/tokens/index.css', '/styles/index.css'];
      await precache(SHELL, shell);
      await self.skipWaiting();
    })()
  );
});

async function pruneOld() {
  for (const key of await caches.keys()) {
    if (!KEEP.has(key)) await caches.delete(key);
  }
}

self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([pruneOld(), claim()]));
});

// Content-hashed build output (/assets/app-3f9a1c2e.js) or versioned (?v=...)
// URLs never change and may be served CacheFirst. Everything else is
// revalidated in the background.
const HASHED = /\\/assets\\/[^/]+-[0-9a-f]{8,}\\.[a-z0-9]+$/i;
const immutable = new CacheFirst(SHELL);
const revalidate = new StaleRevalidate(SHELL);
const assets = {
  handle(request, event) {
    const url = new URL(request.url);
    const versioned = HASHED.test(url.pathname) || url.searchParams.has('v');
    return (versioned ? immutable : revalidate).handle(request, event);
  }
};

const r = router();
r.register('/api/*', new NetworkFirst(API, { timeout: 3000 }));
r.register('*', assets);

/** CSR fragments, navigations and event streams (dev reload) bypass the SW. */
function shouldBypass(request) {
  if (request.mode === 'navigate') return true;
  if (request.method !== 'GET' && request.method !== 'HEAD') return true;
  if ((request.headers.get('accept') || '').includes('text/event-stream')) return true;
  const path = new URL(request.url).pathname;
  return (
    path === '/hmr' ||
    path.endsWith('/template.html') ||
    path.endsWith('.tags.json') ||
    path === '/favicon.ico'
  );
}

self.addEventListener('fetch', (e) => {
  if (shouldBypass(e.request)) return;
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
`;

const PAGE = `/**
 * src/pages/entry/index.js — landing page
 */
import { page } from '@anzaui/anza/ui';

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
import './main/index.js';
`;

const DOCK_MAIN = `/**
 * src/docks/main/index.js — root layout shell
 *
 * Soft-nav shows the built-in \`.anza-loading\` spinner in this dock by default
 * (styles/loading.css is linked from styles/index.css on first load).
 * Override with dock({ loading }) / page({ loading }) / router.loading.configure().
 */
import { dock } from '@anzaui/anza/ui';

dock('main');
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
    <a href="https://github.com/anzaui/anza" target="_blank" rel="noopener">Docs</a>
    <a href="https://github.com/anzaui/anza/issues" target="_blank" rel="noopener">Issues</a>
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

const IGNORE = 'node_modules/\ndist/\ntypes/\n.anzacache.json\n';

/** Every file under `dir`, as paths relative to `dir`. */
function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath ?? entry.path, entry.name)));
}

/** package.json for the new app. */
function manifest(name) {
  return JSON.stringify({
    name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'anza dev',
      build: 'anza build',
    },
    devDependencies: {
      '@anzaui/anza': 'latest',
      // Production bundler used by `anza build` (optional: without it the
      // build ships unbundled modules).
      rolldown: '^1.2.13',
    }
  }, null, 2) + '\n';
}

/**
 * Scaffolds an app into `target`. The directory may already exist (e.g.
 * `npm create @anzaui/anza .`), but if any file the scaffold would write is
 * already there the run stops and lists the conflicts, unless
 * `options.force` is set. Omits anza.json on purpose — zero-config defaults.
 *
 * @param {string} target
 * @param {string} name
 * @param {string} library  Root of the installed @anzaui/anza package.
 * @param {{ force?: boolean }} [options]
 */
export function run(target, name, library, options = {}) {
  if (existsSync(target) && !statSync(target).isDirectory()) {
    logs.error(`Target exists and is not a directory: ${target}`);
    process.exit(1);
  }

  const files = [
    [join('src', 'index.html'), HTML(name)],
    [join('src', 'app.js'), APP],
    [join('src', 'sw.js'), SW],
    [join('src', 'pages', 'entry', 'index.js'), PAGE],
    [join('src', 'pages', 'entry', 'index.html'), MARKUP(name)],
    [join('src', 'pages', 'entry', 'index.css'), STYLE],
    [join('src', 'pages', 'index.js'), PAGES_BARREL],
    [join('src', 'docks', 'index.js'), DOCKS_BARREL],
    [join('src', 'docks', 'main', 'index.js'), DOCK_MAIN],
    [join('src', 'views', 'index.js'), VIEWS_BARREL],
    [join('src', 'parts', 'index.js'), PARTS_BARREL],
    ['package.json', manifest(name)],
    ['importmap.json', '{}\n'],
    ['.gitignore', IGNORE],
  ];

  const copies = [
    [join(library, 'src', 'tokens'), join('src', 'tokens'), 'tokens'],
    [join(library, 'src', 'styles'), join('src', 'styles'), 'styles'],
  ].filter(([src]) => existsSync(src));

  const planned = [
    ...files.map(([rel]) => rel),
    ...copies.flatMap(([src, dst]) => listFiles(src).map((rel) => join(dst, rel))),
  ];

  const conflicts = planned.filter((rel) => existsSync(join(target, rel)));
  if (conflicts.length > 0 && !options.force) {
    logs.error(`Refusing to overwrite ${conflicts.length} existing file(s) in ${target}:`);
    for (const rel of conflicts) logs.error(`  ${rel}`);
    logs.error('Pick an empty directory, or re-run with --force to overwrite them.');
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

  for (const [src, dst, label] of copies) {
    if (copy.copy(src, join(target, dst))) {
      logs.compiler(`Copied library ${label} -> src/${label}/`);
    }
  }

  for (const [rel, content] of files) {
    write.write(join(target, rel), content);
  }

  logs.success(`Created ${target}`);
  logs.info('Next steps:');
  if (target !== process.cwd()) logs.info(`  cd ${name}`);
  logs.info('  npm install');
  logs.info('  npm run dev');
}
