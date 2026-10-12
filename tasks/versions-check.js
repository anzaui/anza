#!/usr/bin/env node
/**
 * tasks/versions-check.js
 *
 * Fails when any published package (or a place that shows the version)
 * disagrees with the single version in .release-please-manifest.json.
 *
 * Checked:
 *   library/package.json (+ package-lock.json)        @anzaui/anza
 *   create/package.json  (+ its @anzaui/anza dep)     @anzaui/create-anza
 *   tools/Cargo.toml     (+ Cargo.lock, src/main.rs)  anza-cli
 *   engines/rust/Cargo.toml (+ README.md snippets)    anza (crate)
 *   engines/ts/package.json (+ package-lock.json)     @anzaui/engine
 *   engines/py/pyproject.toml                         anza (PyPI)
 *   web version badges (entry page, docs dock)
 *
 * release-please bumps all of these (release-please-config.json
 * "extra-files"); this check catches hand edits and new places that were not
 * registered there.
 *
 * Usage: node tasks/versions-check.js [root]   (npm run versions:check)
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..'));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

const manifest = json('.release-please-manifest.json');
const keys = Object.keys(manifest);
if (keys.length !== 1 || keys[0] !== '.') {
  console.error('versions:check: .release-please-manifest.json must hold exactly one entry, ".", for the shared version');
  process.exit(1);
}
const VERSION = manifest['.'];

const errors = [];
let checked = 0;

/** Record one comparison. `found` is undefined when the value is missing. */
function expect(where, found, want = VERSION) {
  checked++;
  if (found === undefined) errors.push(`${where}: version not found (expected ${want})`);
  else if (found !== want) errors.push(`${where}: ${found} (expected ${want})`);
}

/** Value of `key = "..."` inside a TOML [section] (no nested tables needed here). */
function tomlValue(text, section, key) {
  const lines = text.split(/\r?\n/);
  let inside = false;
  for (const line of lines) {
    const header = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (header) {
      inside = header[1].trim() === section;
      continue;
    }
    if (!inside) continue;
    const m = line.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`));
    if (m) return m[1];
  }
  return undefined;
}

/** Version of a [[package]] entry with the given name in a Cargo.lock. */
function cargoLockVersion(text, name) {
  for (const block of text.split(/^\[\[package\]\]\s*$/m)) {
    if (new RegExp(`^name = "${name}"$`, 'm').test(block)) {
      return block.match(/^version = "([^"]*)"$/m)?.[1];
    }
  }
  return undefined;
}

// npm packages and lockfiles
for (const dir of ['library', 'engines/ts']) {
  expect(`${dir}/package.json`, json(`${dir}/package.json`).version);
  const lockPath = `${dir}/package-lock.json`;
  if (existsSync(join(ROOT, lockPath))) {
    const lock = json(lockPath);
    expect(`${lockPath} (version)`, lock.version);
    expect(`${lockPath} (packages[""].version)`, lock.packages?.['']?.version);
  }
}

// create + its dependency on the library
const create = json('create/package.json');
expect('create/package.json', create.version);
const dep = create.dependencies?.['@anzaui/anza'];
expect('create/package.json dependencies["@anzaui/anza"]', dep?.replace(/^[\^~=]/, ''));

// Rust crates
const toolsToml = read('tools/Cargo.toml');
expect('tools/Cargo.toml [package] version', tomlValue(toolsToml, 'package', 'version'));
const cliName = tomlValue(toolsToml, 'package', 'name') ?? 'anza-cli';
if (existsSync(join(ROOT, 'tools/Cargo.lock'))) {
  expect(`tools/Cargo.lock (${cliName})`, cargoLockVersion(read('tools/Cargo.lock'), cliName));
}
expect('engines/rust/Cargo.toml [package] version', tomlValue(read('engines/rust/Cargo.toml'), 'package', 'version'));

// The CLI's --version: a literal in #[command(version = "...")] must match too.
// Prefer `#[command(version)]`, which reads CARGO_PKG_VERSION at compile time.
const mainRs = read('tools/src/main.rs');
for (const m of mainRs.matchAll(/^\s*version\s*=\s*"([^"]*)"/gm)) {
  expect('tools/src/main.rs #[command(version = ...)] (use `version` without a value instead)', m[1]);
}

// Python
expect('engines/py/pyproject.toml [project] version', tomlValue(read('engines/py/pyproject.toml'), 'project', 'version'));

// Docs snippets: anza = "x.y.z" / anza = { version = "x.y.z", ... }
const readme = read('engines/rust/README.md');
const snippets = [...readme.matchAll(/^anza\s*=\s*(?:"([^"]+)"|\{[^}]*version\s*=\s*"([^"]+)")/gm)];
if (snippets.length === 0) expect('engines/rust/README.md (anza = "...")', undefined);
for (const m of snippets) expect('engines/rust/README.md (anza = ...)', m[1] ?? m[2]);

// Web version badges
for (const [file, re] of [
  ['web/src/pages/entry/index.html', /class="version-badge">v([^<]+)</],
  ['web/src/docks/docs/index.html', /class="version">v([^<]+)</],
]) {
  expect(file, read(file).match(re)?.[1]);
}

if (errors.length) {
  console.error(`versions:check: ${errors.length} mismatch(es) against .release-please-manifest.json (${VERSION}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`versions:check: ${checked} version references match ${VERSION}`);
