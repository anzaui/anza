#!/usr/bin/env node
/**
 * tasks/doc-imports-check.js
 *
 * Fails when a doc teaches an import that does not work.
 *
 * Scans every ```js / ```javascript block in docs/**\/*.md and the project
 * READMEs, extracts static imports / re-exports / dynamic imports from
 * '@anzaui/anza…', and checks that:
 *   1. the specifier is reachable through library/package.json "exports";
 *   2. every named symbol is actually exported by that subpath
 *      (static analysis, see tasks/lib/exports.js).
 *
 * Usage: node tasks/doc-imports-check.js   (npm run doc:imports)
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, PKG, subpaths, keyOf, isExported, exportReader } from './lib/exports.js';

const READMES = [
  'README.md',
  'library/README.md',
  'create/README.md',
  'engines/rust/README.md',
  'engines/ts/README.md',
  'engines/py/README.md'
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

const files = [
  ...walk(join(ROOT, 'docs')),
  ...READMES.map((f) => join(ROOT, f)).filter(existsSync)
];

const FENCE = /^(\s*)(`{3,}|~{3,})\s*(js|javascript|mjs)\b[^\n]*\n([\s\S]*?)^\1\2\s*$/gm;
const STATIC = /\b(import|export)\s+(?:type\s+)?([^'";]*?)\s+from\s*(['"])([^'"]+)\3/g;
const BARE = /\bimport\s*(['"])([^'"]+)\1/g;
const DYNAMIC = /\bimport\(\s*(['"])([^'"]+)\1\s*\)/g;

/** Parse the clause between `import` and `from` into imported names. */
function names(kind, clause) {
  const out = [];
  const braces = clause.match(/\{([\s\S]*)\}/);
  if (braces) {
    for (let part of braces[1].split(',')) {
      part = part.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!part) continue;
      part = part.replace(/^type\s+/, '');
      out.push(part.split(/\s+as\s+/)[0].trim());
    }
  }
  const head = clause.replace(/\{[\s\S]*\}/, '').replace(/,/g, ' ').trim();
  if (kind === 'import' && head && !head.startsWith('*')) out.push('default');
  return out;
}

const sp = subpaths();
const read = exportReader([...sp.values()].map((v) => v.runtime));
const cache = new Map();
function exportsOf(key) {
  if (!cache.has(key)) {
    const entry = sp.get(key);
    cache.set(key, entry?.runtime ? read(entry.runtime) : null);
  }
  return cache.get(key);
}

const problems = [];
let blocks = 0;
let imports = 0;

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);
  for (const block of text.matchAll(FENCE)) {
    blocks++;
    // Blank out whole-line comments (keeps offsets and line numbers).
    const code = block[4].replace(/^[ \t]*\/\/.*$/gm, (c) => ' '.repeat(c.length));
    const lineOf = (index) => text.slice(0, block.index + block[0].indexOf(code) + index).split('\n').length;
    const found = [];
    for (const m of code.matchAll(STATIC)) found.push({ at: m.index, spec: m[4], list: names(m[1], m[2]) });
    for (const m of code.matchAll(BARE)) found.push({ at: m.index, spec: m[2], list: [] });
    for (const m of code.matchAll(DYNAMIC)) found.push({ at: m.index, spec: m[2], list: [] });

    for (const { at, spec, list } of found) {
      if (spec !== PKG.name && !spec.startsWith(PKG.name + '/')) continue;
      if (spec.includes('<')) continue; // placeholder such as elements/<name>
      imports++;
      const where = `${rel}:${lineOf(at)}`;
      if (!isExported(spec)) {
        problems.push(`${where}  '${spec}' is not in library/package.json exports`);
        continue;
      }
      if (!list.length) continue;
      const key = keyOf(spec);
      const info = exportsOf(key);
      if (!info) {
        problems.push(`${where}  '${spec}' is not a JS module, cannot import { ${list.join(', ')} }`);
        continue;
      }
      for (const name of list) {
        if (info.names.has(name)) continue;
        const why = info.ambiguous.has(name)
          ? 'is ambiguous (exported by two modules re-exported with export *)'
          : 'is not exported';
        problems.push(`${where}  { ${name} } from '${spec}' ${why}`);
      }
    }
  }
}

if (problems.length) {
  console.error(`doc-imports: ${problems.length} broken import(s)\n`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`doc-imports: ok (${files.length} files, ${blocks} js blocks, ${imports} @anzaui/anza imports)`);
