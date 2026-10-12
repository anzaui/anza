#!/usr/bin/env node
/**
 * tasks/doc-links-check.js
 *
 * Checks the Markdown links in docs/ (the source of the docs site):
 * - a link label must not be a file name (`[api.md](api.md)` renders as
 *   "api.md" on the site; use the page title);
 * - a relative link to a .md file must point at a file that exists;
 * - a #fragment on such a link must match a heading in the target.
 *
 * Usage: node tasks/doc-links-check.js   (npm run doc:links)
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.md') ? [path] : [];
  });
}

/** GitHub-style heading slug. The docs generator must emit the same heading ids. */
function slug(text) {
  return text
    .replace(/[`*_]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-');
}

const stripCode = (text) => text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, (m) => m.replace(/\[|\]/g, ' '));
const headingCache = new Map();
function headings(file) {
  if (!headingCache.has(file)) {
    const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
    headingCache.set(file, new Set([...text.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((m) => slug(m[1]))));
  }
  return headingCache.get(file);
}

const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const errors = [];
let checked = 0;

for (const file of walk(DOCS)) {
  const text = stripCode(readFileSync(file, 'utf8'));
  for (const m of text.matchAll(LINK)) {
    const [, label, target] = m;
    if (/^[a-z]+:/i.test(target) || target.startsWith('/')) continue;
    const line = text.slice(0, m.index).split('\n').length;
    const where = `${relative(ROOT, file)}:${line}`;
    checked++;
    if (/^`?[\w./-]+\.md(#[^\]`]*)?`?$/.test(label.trim())) {
      errors.push(`${where}: link label "${label}" is a file name; use the page title`);
    }
    const [path, fragment] = target.split('#');
    if (!path.endsWith('.md')) continue;
    const dest = resolve(dirname(file), path);
    if (!existsSync(dest)) {
      errors.push(`${where}: ${target} does not exist`);
      continue;
    }
    if (fragment && !headings(dest).has(fragment)) {
      errors.push(`${where}: ${target} has no heading #${fragment}`);
    }
  }
}

if (errors.length) {
  console.error(`doc-links: ${errors.length} problem(s)\n`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`doc-links: ok (${checked} relative links)`);
