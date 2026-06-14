#!/usr/bin/env node
/**
 * tasks/docs.js
 *
 * Convert docs/*.md (recursively) into anza page templates under web/src/pages/docs/.
 * Uses globally installed pulldown-cmark for markdown → HTML.
 *
 * Usage:
 *   node tasks/docs.js
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, basename, extname, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const docsDir = join(root, 'docs');
const outDir = join(root, 'web', 'src', 'pages', 'docs');

// Ensure output dir exists
mkdirSync(outDir, { recursive: true });

/**
 * Convert a docs/*.md path to an anza route.
 * docs/intro/start.md → /docs/intro/start
 */
function routeFromMd(mdPath) {
  const rel = relative(docsDir, mdPath);
  const noExt = rel.replace(/\.md$/, '');
  return '/docs/' + noExt.replace(/\\/g, '/');
}

/**
 * Convert a docs/*.md path to output folder path.
 * docs/intro/start.md → web/src/pages/docs/intro/start
 */
function outFolderFromMd(mdPath) {
  const rel = relative(docsDir, mdPath);
  const noExt = rel.replace(/\.md$/, '');
  return join(outDir, noExt);
}

/**
 * Generate an anza-safe tag name from a route.
 * /docs/intro/start → doc-intro-start
 */
function tagFromRoute(route) {
  return 'doc-' + route.replace(/^\/docs\//, '').replace(/\//g, '-');
}

/**
 * Rewrite .md links in HTML to anza routes.
 * href="intro/start.md" → href="../intro/start/"
 * href="../router/api.md" → href="../../router/api/"
 */
function rewriteLinks(html, currentMdPath) {
  const currentDir = dirname(relative(docsDir, currentMdPath));

  return html.replace(
    /href="([^"]+)"/g,
    (match, href) => {
      if (!href.endsWith('.md')) return match;

      const targetMd = href;
      const targetNoExt = targetMd.replace(/\.md$/, '');
      const targetDir = dirname(targetNoExt);
      const targetBase = basename(targetNoExt);

      if (currentDir === '.') {
        // Root-level md → need to go down into folder
        if (targetDir === '.') {
          return `href="${targetBase}/"`;
        }
        return `href="${targetDir}/${targetBase}/"`;
      }

      // Same directory
      if (dirname(join(currentDir, 'x')) === dirname(join(targetNoExt, 'x'))) {
        return `href="${targetBase}/"`;
      }

      // Compute relative path from current dir to target
      const rel = relative(currentDir, targetNoExt).replace(/\\/g, '/');
      return `href="${rel}/"`;
    }
  );
}

/**
 * Run pulldown-cmark on a markdown file and return the HTML body.
 */
function mdToHtml(mdPath) {
  const raw = execSync(`pulldown-cmark -T -S -L -G < "${mdPath}"`, { encoding: 'utf8' });
  return raw.trim();
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
  const folder = outFolderFromMd(mdPath);
  const tag = tagFromRoute(route);

  mkdirSync(folder, { recursive: true });

  // 1. Convert markdown to HTML body
  let htmlBody = mdToHtml(mdPath);
  htmlBody = rewriteLinks(htmlBody, mdPath);

  // 2. Write index.html (just the body content, anza dock provides the shell)
  writeFileSync(join(folder, 'index.html'), htmlBody + '\n');

  // 3. Write index.js (anza page route)
  const js = `import { page } from '@adukiorg/anza/ui';

page('${route}', {
  tag: '${tag}',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' }
}, import.meta.url);
`;
  writeFileSync(join(folder, 'index.js'), js);

  console.log(`  ${route} → ${relative(root, folder)}`);
}

// ── Main ──────────────────────────────────────────────────────────────────

console.log('Converting docs/ to anza pages...');

const mdFiles = walkMd(docsDir);
console.log(`Found ${mdFiles.length} markdown files\n`);

for (const mdPath of mdFiles) {
  generatePage(mdPath);
}

// Generate a docs index importer if it doesn't exist
const docsIndexPath = join(outDir, 'index.js');
if (!existsSync(docsIndexPath)) {
  const indexJs = `import { page } from '@adukiorg/anza/ui';

page('/docs', {
  tag: 'doc-index',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: '<h1>Docs</h1><p>Documentation index coming soon.</p>'
});
`;
  writeFileSync(docsIndexPath, indexJs);
  console.log('\n  /docs → web/src/pages/docs/index.js (placeholder)');
}

console.log('\nDone. Import doc pages from web/src/app.js or a dedicated docs layout.');
