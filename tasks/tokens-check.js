#!/usr/bin/env node
/**
 * tasks/tokens-check.js
 *
 * Fails when an element or base stylesheet uses a design token
 * (`var(--name)` without a fallback) that nothing in library/src declares.
 * Such a token silently resolves to nothing, so the element renders without
 * that radius, colour, shadow or size.
 *
 * Ignored: component custom properties (`--el-*`, meant to be set by users)
 * and names built at run time (`--font-size-${size}` shows up as `--font-size-`).
 *
 * Usage: node tasks/tokens-check.js   (npm run tokens:check)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'library', 'src');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : /\.(css|js)$/.test(name) ? [path] : [];
  });
}

const all = walk(SRC);
const declared = new Set();
for (const file of all) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1]);
  for (const m of text.matchAll(/setProperty\(\s*['"](--[\w-]+)/g)) declared.add(m[1]);
  for (const m of text.matchAll(/@property\s+(--[\w-]+)/g)) declared.add(m[1]);
}

const used = new Map();
for (const file of all) {
  const rel = relative(SRC, file);
  if (!rel.startsWith('elements/') && !rel.startsWith('styles/')) continue;
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
    const [, name, fallback] = m;
    if (fallback || declared.has(name) || name.startsWith('--el-') || name.endsWith('-')) continue;
    if (!used.has(name)) used.set(name, new Set());
    used.get(name).add(rel);
  }
}

if (used.size) {
  console.error(`tokens-check: ${used.size} token(s) used without a fallback but never declared\n`);
  for (const [name, files] of [...used].sort()) console.error(`  ${name}  (${[...files].slice(0, 3).join(', ')})`);
  process.exit(1);
}
console.log(`tokens-check: ok (${declared.size} declared custom properties)`);
