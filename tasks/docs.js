#!/usr/bin/env node
/**
 * tasks/docs.js
 *
 * Convert docs/*.md (recursively) into anza page templates under web/src/docs/.
 * Uses globally installed pulldown-cmark for markdown → HTML.
 *
 * - Updates index.html for each markdown file
 * - Preserves existing index.js (seo / style / redirects)
 * - docs/index.md syncs to web/src/docs/entry/ (canonical /docs home)
 * - Skips overwriting redirect stubs (/docs/index, /docs/ui/styles)
 *
 * Usage:
 *   node tasks/docs.js
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const docsDir = join(root, 'docs');
const outDir = join(root, 'web', 'src', 'docs');

// Routes whose folders are hand-maintained redirects — never overwrite from md.
const SKIP_ROUTES = new Set(['/docs/index', '/docs/ui/styles']);

mkdirSync(outDir, { recursive: true });

/**
 * Convert a docs/*.md path to an anza route.
 * docs/intro/start.md → /docs/intro/start
 * docs/index.md → /docs (entry TOC; not /docs/index redirect)
 */
function routeFromMd(mdPath) {
  const rel = relative(docsDir, mdPath);
  const noExt = rel.replace(/\.md$/, '').replace(/\\/g, '/');
  if (noExt === 'index') return '/docs';
  return '/docs/' + noExt;
}

/**
 * Convert a docs/*.md path to output folder path.
 * docs/intro/start.md → web/src/docs/intro/start
 * docs/index.md → web/src/docs/entry
 */
function outFolderFromMd(mdPath) {
  const rel = relative(docsDir, mdPath);
  const noExt = rel.replace(/\.md$/, '').replace(/\\/g, '/');
  if (noExt === 'index') return join(outDir, 'entry');
  return join(outDir, noExt);
}

/**
 * Generate an anza-safe tag name from a route.
 * /docs/intro/start → doc-intro-start
 */
function tagFromRoute(route) {
  if (route === '/docs') return 'page-docs';
  return 'doc-' + route.replace(/^\/docs\//, '').replace(/\//g, '-');
}

/**
 * Resolve a .md href relative to the current markdown file to an absolute /docs route.
 */
function mdHrefToRoute(href, currentMdPath) {
  const currentRel = relative(docsDir, currentMdPath).replace(/\\/g, '/');
  const currentDir = dirname(currentRel);
  const joined = join(currentDir === '.' ? '' : currentDir, href).replace(/\\/g, '/');
  const normalized = joined
    .split('/')
    .reduce((acc, part) => {
      if (part === '' || part === '.') return acc;
      if (part === '..') {
        acc.pop();
        return acc;
      }
      acc.push(part);
      return acc;
    }, [])
    .join('/');
  const noExt = normalized.replace(/\.md$/, '');
  if (noExt === 'index' || noExt === '') return '/docs';
  return '/docs/' + noExt;
}

/**
 * Rewrite .md links in HTML to absolute anza routes.
 * href="intro/start.md" → href="/docs/intro/start"
 * href="../router/api.md" → href="/docs/router/api"
 * href="../styles/index.md" → href="/docs/styles/index"
 */
function rewriteLinks(html, currentMdPath) {
  return html.replace(/href="([^"]+)"/g, (match, href) => {
    if (!href.endsWith('.md')) return match;
    // Ignore links that escape the docs tree (e.g. plans/)
    const route = mdHrefToRoute(href, currentMdPath);
    if (!route.startsWith('/docs')) return match;
    // plans/ and other repo paths resolve outside docsDir → may not start cleanly;
    // reject if the resolved file is outside docs/
    const targetFs = join(dirname(currentMdPath), href);
    const resolved = relative(docsDir, targetFs);
    if (resolved.startsWith('..') || resolved.includes('..' + '/')) return match;
    return `href="${route}"`;
  });
}

/**
 * Run pulldown-cmark on a markdown file and return the HTML body.
 */
function mdToHtml(mdPath) {
  const raw = execSync(`pulldown-cmark -T -S -L -G < "${mdPath}"`, { encoding: 'utf8' });
  return raw.trim();
}

const LANG_ALIASES = {
  js: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
};

/**
 * Map pulldown-cmark <pre><code> fences to the hand-crafted view-code pattern
 * used across docs (Prism highlighting + copy button). Without this, docs.js
 * regen wipes view-code back to plain <pre>.
 */
function preToViewCode(html) {
  const normalize = (lang) => {
    const key = String(lang || 'text').trim().toLowerCase();
    return LANG_ALIASES[key] || key || 'text';
  };

  let out = html.replace(
    /<pre><code class="language-([^"]+)">([\s\S]*?)<\/code><\/pre>/g,
    (_, lang, body) => `<view-code language="${normalize(lang)}">${body}</view-code>`
  );
  out = out.replace(
    /<pre><code>([\s\S]*?)<\/code><\/pre>/g,
    (_, body) => `<view-code language="text">${body}</view-code>`
  );
  return out;
}

/**
 * Wrap bare <table> elements in <div class="table-wrap"> so shared.css table
 * styling applies. pulldown-cmark emits naked tables; hand-crafted docs use
 * the wrapper. Skip tables already inside table-wrap.
 */
function wrapTables(html) {
  return html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (table, offset) => {
    const before = html.slice(Math.max(0, offset - 80), offset);
    if (/<div\s+class="table-wrap"\s*>\s*$/i.test(before)) return table;
    return `<div class="table-wrap">${table}</div>`;
  });
}

/**
 * Walk a directory recursively and collect all .md files.
 */
function walkMd(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) {
      walkMd(path, files);
    } else if (st.isFile() && entry.endsWith('.md')) {
      files.push(path);
    }
  }
  return files;
}

/**
 * Generate anza page files for a single markdown file.
 */
function generatePage(mdPath) {
  const route = routeFromMd(mdPath);
  if (SKIP_ROUTES.has(route)) {
    console.log(`  skip ${route} (redirect stub)`);
    return;
  }

  const folder = outFolderFromMd(mdPath);
  const tag = tagFromRoute(route);
  const jsPath = join(folder, 'index.js');

  mkdirSync(folder, { recursive: true });

  let htmlBody = mdToHtml(mdPath);
  htmlBody = rewriteLinks(htmlBody, mdPath);
  htmlBody = preToViewCode(htmlBody);
  htmlBody = wrapTables(htmlBody);
  writeFileSync(join(folder, 'index.html'), htmlBody + '\n');

  if (!existsSync(jsPath)) {
    const js = `import { page } from '@adukiorg/anza/ui';

page('${route}', {
  tag: '${tag}',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
`;
    writeFileSync(jsPath, js);
    console.log(`  ${route} → ${relative(root, folder)} (new)`);
  } else {
    console.log(`  ${route} → ${relative(root, folder)} (html)`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

console.log('Converting docs/ to anza pages...');

const mdFiles = walkMd(docsDir);
console.log(`Found ${mdFiles.length} markdown files\n`);

for (const mdPath of mdFiles) {
  generatePage(mdPath);
}

console.log('\nDone. Existing index.js files were preserved; only HTML bodies were refreshed.');
