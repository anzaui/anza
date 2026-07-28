use std::fs;
use std::path::Path;

use super::{copy, find, write};

const DIRS: &[&str] = &[
  "src",
  "src/pages",
  "src/pages/entry",
  "src/docks",
  "src/views",
  "src/parts",
  "src/elements",
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
 */
import '@adukiorg/anza/ui';
import { dock } from '@adukiorg/anza/ui';
import '@adukiorg/anza/theme';

// Service Worker
navigator.serviceWorker.register('/sw.js', { type: 'module' });

// Layout shell
dock('main');

// Pages
import './pages/index.js';
"#;

const SW: &str = r#"/**
 * src/sw.js — Service Worker entry
 */
import { precache, router, CacheFirst, NetworkFirst, pruneStale, claim } from '@adukiorg/anza/sw';

const SHELL = 'shell-v1';
const API = 'api-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(precache(SHELL, ['/index.html', '/app.js', '/tokens/index.css', '/styles/index.css']));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([pruneStale(SHELL), claim()]));
});

const r = router();
r.register('/*', new CacheFirst(SHELL));
r.register('/api/*', new NetworkFirst(API, { timeout: 3000 }));

self.addEventListener('fetch', (e) => {
  if (r.handle(e)) return;
  e.respondWith(fetch(e.request));
});
"#;

const PAGE: &str = r#"/**
 * src/entry/index.js — landing page
 */
import { page } from '@adukiorg/anza/ui';

page('/', {
  tag: 'page-welcome',
  via: ['main'],
  template: { html: './index.html', css: './index.css' }
}, import.meta.url);
"#;

const BARREL: &str = r#"/**
 * src/pages/index.js
 *
 * Barrel — imports all app pages.
 */
import './entry/index.js';
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

/// Scaffolds a new anza app at `target` with the given `name`.
pub fn run(target: &Path, name: &str) {
  if target.exists() {
    logs::error!("Target directory already exists: {}", target.display());
    std::process::exit(1);
  }

  logs::info!("Scaffolding anza app: {}", name);

  for dir in DIRS {
    let path = target.join(dir);
    fs::create_dir_all(&path).unwrap_or_else(|e| {
      logs::error!("Failed to create {}: {}", path.display(), e);
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
        logs::warn!("Could not copy tokens: {}", e);
      } else {
        logs::compiler!("Copied library tokens -> src/tokens/");
      }
    }

    if lib_styles.exists() {
      if let Err(e) = copy::copy(&lib_styles, &app_styles) {
        logs::warn!("Could not copy styles: {}", e);
      } else {
        logs::compiler!("Copied library styles -> src/styles/");
      }
    }
  } else {
    logs::warn!("Library directory not found; skipping token/style copy.");
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
    BARREL,
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
    "@adukiorg/anza": "latest"
  }}
}}
"#,
    name
  );
  write::write(target.join("package.json"), &manifest);
  write::write(target.join(".gitignore"), IGNORE);

  logs::success!("Created {}", target.display());
  logs::info!("Next steps:");
  logs::info!("  cd {}", target.file_name().unwrap_or_default().to_string_lossy());
  logs::info!("  npm install");
  logs::info!("  npm run dev");
}
