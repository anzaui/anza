use std::fs;
use std::path::Path;

use super::{copy, find, write};

const DIRS: &[&str] = &[
  "src",
  "src/pages",
  "src/pages/entry",
  "src/docks",
  "src/docks/main",
  "src/views",
  "src/parts",
  "src/tokens",
  "src/styles",
];

const HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{name}</title>

    <script type="importmap" src="/importmap.json"></script>

    <link rel="stylesheet" href="/tokens/index.css" />
    <link rel="stylesheet" href="/styles/index.css" />

    <script type="module" src="/app.js"></script>
  </head>
  <body>
    <dock-main id="main"></dock-main>
  </body>
</html>
"#;

const APP: &str = r#"/**
 * src/app.js — app entry point
 *
 * Import order here is free-form. `anza build` rewrites static imports in
 * dist/ into usage order (library → docks → views → parts → pages).
 */
import '@anzaui/anza/ui';
import '@anzaui/anza/theme';

import './docks/index.js';
import './views/index.js';
import './parts/index.js';
import './pages/index.js';

// Service Worker
navigator.serviceWorker.register('/sw.js', { type: 'module' });
"#;

const SW: &str = r#"/**
 * src/sw.js — Service Worker entry
 *
 * Optional helpers live under src/sw/ (modules only — not extra registrations).
 */
import { precache, router, CacheFirst, NetworkFirst, pruneStale, claim } from '@anzaui/anza/sw';

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
"#;

const PAGE: &str = r#"/**
 * src/pages/entry/index.js — landing page
 */
import { page } from '@anzaui/anza/ui';

page('/', {
  tag: 'page-welcome',
  via: ['main'],
  template: { html: './index.html', css: './index.css' }
}, import.meta.url);
"#;

const PAGES_BARREL: &str = r#"/**
 * src/pages/index.js
 *
 * Barrel — each meaningful folder should expose an index (convention).
 * Import page modules from this tree (and extra trees via their own barrels).
 */
import './entry/index.js';
"#;

const DOCKS_BARREL: &str = r#"/**
 * src/docks/index.js
 *
 * Barrel — import each dock module from this folder.
 * Co-located views under docks/ are organization only; custom element tags stay global.
 */
import './main/index.js';
"#;

const DOCK_MAIN: &str = r#"/**
 * src/docks/main/index.js — root layout shell
 *
 * Soft-nav shows the built-in `.anza-loading` spinner in this dock by default
 * (styles/loading.css is linked from styles/index.css on first load).
 * Override with dock({ loading }) / page({ loading }) / router.loading.configure().
 */
import { dock } from '@anzaui/anza/ui';

dock('main');
"#;

const VIEWS_BARREL: &str = r#"/**
 * src/views/index.js
 *
 * Barrel — optional global views slot (remap via anza.json `views`).
 * Co-location under docks/user trees is organization only — not a per-dock CE registry.
 */
"#;

const PARTS_BARREL: &str = r#"/**
 * src/parts/index.js
 *
 * Barrel — import each part module from this folder.
 */
"#;

const MARKUP: &str = r#"<article class="welcome">
  <h1>Welcome to {name}</h1>
  <p>Your anza app is running.</p>
  <nav>
    <a href="https://github.com/aduki-org/anza" target="_blank" rel="noopener">Docs</a>
    <a href="https://github.com/aduki-org/anza/issues" target="_blank" rel="noopener">Issues</a>
  </nav>
</article>
"#;

const STYLE: &str = r#".welcome {
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
"#;

const IGNORE: &str = "node_modules/\ndist/\n.anzacache.json\n";

const IMPORTMAP: &str = "{}\n";

/// Scaffolds a new anza app at `target` with the given `name`.
///
/// Omits `anza.json` on purpose — zero-config defaults. Add the file only when
/// remapping slots or declaring extra page trees / SW entries.
pub fn run(target: &Path, name: &str) {
  if target.exists() {
    anza_logs::error!("Target directory already exists: {}", target.display());
    std::process::exit(1);
  }

  anza_logs::info!("Scaffolding anza app: {}", name);

  for dir in DIRS {
    let path = target.join(dir);
    fs::create_dir_all(&path).unwrap_or_else(|e| {
      anza_logs::error!("Failed to create {}: {}", path.display(), e);
      std::process::exit(1);
    });
  }

  let lib = find::find();

  if let Some(ref root) = lib {
    let lib_tokens = root.join("src").join("tokens");
    let lib_styles = root.join("src").join("styles");
    let app_tokens = target.join("src").join("tokens");
    let app_styles = target.join("src").join("styles");

    if lib_tokens.exists() {
      if let Err(e) = copy::copy(&lib_tokens, &app_tokens) {
        anza_logs::warn!("Could not copy tokens: {}", e);
      } else {
        anza_logs::compiler!("Copied library tokens -> src/tokens/");
      }
    }

    if lib_styles.exists() {
      if let Err(e) = copy::copy(&lib_styles, &app_styles) {
        anza_logs::warn!("Could not copy styles: {}", e);
      } else {
        anza_logs::compiler!("Copied library styles -> src/styles/");
      }
    }
  } else {
    anza_logs::warn!("Library directory not found; skipping token/style copy.");
  }

  write::write(
    target.join("src").join("index.html"),
    &HTML.replace("{name}", name),
  );
  write::write(target.join("src").join("app.js"), APP);
  write::write(target.join("src").join("sw.js"), SW);
  write::write(
    target.join("src").join("pages").join("entry").join("index.js"),
    PAGE,
  );
  write::write(
    target.join("src").join("pages").join("entry").join("index.html"),
    &MARKUP.replace("{name}", name),
  );
  write::write(
    target.join("src").join("pages").join("entry").join("index.css"),
    STYLE,
  );
  write::write(
    target.join("src").join("pages").join("index.js"),
    PAGES_BARREL,
  );
  write::write(
    target.join("src").join("docks").join("index.js"),
    DOCKS_BARREL,
  );
  write::write(
    target.join("src").join("docks").join("main").join("index.js"),
    DOCK_MAIN,
  );
  write::write(
    target.join("src").join("views").join("index.js"),
    VIEWS_BARREL,
  );
  write::write(
    target.join("src").join("parts").join("index.js"),
    PARTS_BARREL,
  );

  let manifest = format!(
    r#"{{
  "name": "{}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {{
    "dev": "anza dev",
    "build": "anza build"
  }},
  "devDependencies": {{
    "@anzaui/anza": "latest"
  }}
}}
"#,
    name
  );
  write::write(target.join("package.json"), &manifest);
  write::write(target.join("importmap.json"), IMPORTMAP);
  write::write(target.join(".gitignore"), IGNORE);

  anza_logs::success!("Created {}", target.display());
  anza_logs::info!("Next steps:");
  anza_logs::info!("  cd {}", target.file_name().unwrap_or_default().to_string_lossy());
  anza_logs::info!("  npm install");
  anza_logs::info!("  npm run dev");
}
