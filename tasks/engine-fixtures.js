#!/usr/bin/env node
/**
 * tasks/engine-fixtures.js
 *
 * engines/fixtures/ is the single source of the golden contract fixtures
 * (regenerate with `python3 engines/fixtures/generate.py`). Each engine is also
 * published from its own repository (anzaui/rust, anzaui/ts, anzaui/py), so its
 * test suite reads a vendored copy in engines/<engine>/tests/fixtures/.
 *
 * Usage:
 *   node tasks/engine-fixtures.js           # copy engines/fixtures into each engine
 *   node tasks/engine-fixtures.js --check   # fail if any copy differs (CI)
 */

import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'engines', 'fixtures');
const ENGINES = ['rust', 'ts', 'py'];
// Not part of the fixtures themselves.
const SKIP = new Set(['generate.py', '__pycache__']);
const check = process.argv.includes('--check');

function files(dir, base = dir) {
  return readdirSync(dir)
    .filter((name) => !SKIP.has(name))
    .flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path, base) : [relative(base, path)];
    })
    .sort();
}

const expected = files(SOURCE);
const problems = [];

for (const engine of ENGINES) {
  const target = join(ROOT, 'engines', engine, 'tests', 'fixtures');
  if (!check) {
    rmSync(target, { recursive: true, force: true });
    cpSync(SOURCE, target, { recursive: true, filter: (src) => !SKIP.has(src.split(/[\\/]/).pop()) });
    continue;
  }
  const actual = existsSync(target) ? files(target) : [];
  for (const f of expected) {
    const copy = join(target, f);
    if (!existsSync(copy)) problems.push(`${engine}: missing ${f}`);
    else if (!readFileSync(copy).equals(readFileSync(join(SOURCE, f)))) problems.push(`${engine}: ${f} differs`);
  }
  for (const f of actual) if (!expected.includes(f)) problems.push(`${engine}: extra ${f}`);
}

if (problems.length) {
  console.error('engine-fixtures: copies are out of date (run node tasks/engine-fixtures.js)\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(check ? `engine-fixtures: ${ENGINES.length} copies match (${expected.length} files)` : `engine-fixtures: copied ${expected.length} files into ${ENGINES.join(', ')}`);
