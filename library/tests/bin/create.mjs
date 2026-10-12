/**
 * tests/bin/create.mjs
 *
 * X5: the scaffolder refuses to overwrite existing files unless --force.
 * Plain `node --test` (not web-test-runner): run with `npm run test:bin`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'bin', 'create', 'index.js');

function create(cwd, ...args) {
  return spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8' });
}

function sandbox(t) {
  const dir = mkdtempSync(join(tmpdir(), 'anza-create-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('scaffolds into a new directory', (t) => {
  const dir = sandbox(t);
  const res = create(dir, 'my-app');
  assert.equal(res.status, 0, res.stderr + res.stdout);
  assert.ok(existsSync(join(dir, 'my-app', 'package.json')));
  assert.ok(existsSync(join(dir, 'my-app', 'src', 'app.js')));
});

test('scaffolds into an existing empty directory with "."', (t) => {
  const dir = sandbox(t);
  const res = create(dir, '.');
  assert.equal(res.status, 0, res.stderr + res.stdout);
  assert.ok(existsSync(join(dir, 'src', 'index.html')));
});

test('keeps unrelated files in an existing directory', (t) => {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'notes.txt'), 'keep me');
  const res = create(dir, '.');
  assert.equal(res.status, 0, res.stderr + res.stdout);
  assert.equal(readFileSync(join(dir, 'notes.txt'), 'utf8'), 'keep me');
});

test('refuses to overwrite existing files and lists them', (t) => {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'package.json'), '{"name":"mine"}');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'app.js'), '// mine');

  const res = create(dir, '.');
  assert.notEqual(res.status, 0);
  const out = res.stderr + res.stdout;
  assert.match(out, /package\.json/);
  assert.match(out, /app\.js/);
  assert.match(out, /--force/);
  assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), '{"name":"mine"}');
  assert.equal(readFileSync(join(dir, 'src', 'app.js'), 'utf8'), '// mine');
  assert.ok(!existsSync(join(dir, 'src', 'sw.js')), 'nothing should be written on refusal');
});

test('refuses a named directory with conflicting files', (t) => {
  const dir = sandbox(t);
  mkdirSync(join(dir, 'app'));
  writeFileSync(join(dir, 'app', '.gitignore'), 'mine\n');
  const res = create(dir, 'app');
  assert.notEqual(res.status, 0);
  assert.equal(readFileSync(join(dir, 'app', '.gitignore'), 'utf8'), 'mine\n');
});

test('--force overwrites conflicting files', (t) => {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'package.json'), '{"name":"mine"}');
  const res = create(dir, '.', '--force');
  assert.equal(res.status, 0, res.stderr + res.stdout);
  assert.notEqual(readFileSync(join(dir, 'package.json'), 'utf8'), '{"name":"mine"}');
});
