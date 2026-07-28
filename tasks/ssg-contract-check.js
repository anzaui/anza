#!/usr/bin/env node
/**
 * tasks/ssg-contract-check.js
 *
 * Lightweight Mode A HTML contract checks against golden fixtures and
 * (when present) the built intro/start page under web/dist.
 *
 * Usage (repo root):
 *   node tasks/ssg-contract-check.js
 *   node tasks/ssg-contract-check.js --rebuild
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = join(root, 'plans', 'fixtures', 'ssg');
const webDir = join(root, 'web');
const builtIntro = join(webDir, 'dist', 'docs', 'intro', 'start', 'index.html');
const builtHome = join(webDir, 'dist', 'index.html');

const rebuild = process.argv.includes('--rebuild');
let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function assertContains(html, needle, label) {
  if (!html.includes(needle)) fail(`${label}: missing ${JSON.stringify(needle)}`);
  else ok(`${label}: has ${JSON.stringify(needle)}`);
}

function assertAbsent(html, needle, label) {
  if (html.includes(needle)) fail(`${label}: must not contain ${JSON.stringify(needle)}`);
  else ok(`${label}: no ${JSON.stringify(needle)}`);
}

/** Flag /dist/ only on asset href/src (not prose mentioning dist/). */
function assertNoDistAssetUrls(html, label) {
  const re = /\b(?:href|src)\s*=\s*["']\/dist\//gi;
  if (re.test(html)) fail(`${label}: asset URL uses /dist/ prefix`);
  else ok(`${label}: no /dist/ asset hrefs/srcs`);
}

function checkPage(html, label, { requireTitle = true } = {}) {
  if (requireTitle) assertContains(html, '<title>', label);
  assertContains(html, 'shadowrootmode="open"', label);
  assertAbsent(html, 'shadowrootmode="closed"', label);
  assertNoDistAssetUrls(html, label);
  assertContains(html, 'href="/tokens/index.css"', label);
  assertContains(html, 'href="/styles/index.css"', label);
  assertContains(html, 'rel="modulepreload"', label);
  assertContains(html, 'src="/app.js"', label);
  assertContains(html, 'type="importmap"', label);
}

function maybeRebuild() {
  if (!rebuild && existsSync(builtIntro)) return;
  if (!rebuild && !existsSync(builtIntro)) {
    console.log('web/dist missing intro/start HTML; building…');
  } else {
    console.log('Rebuilding web…');
  }
  const anzaBin = join(root, 'tools', 'target', 'release', 'anza');
  const env = { ...process.env };
  if (existsSync(anzaBin)) {
    env.PATH = `${dirname(anzaBin)}${env.PATH ? `:${env.PATH}` : ''}`;
  }
  execSync('npm run build', { cwd: webDir, stdio: 'inherit', env });
}

function readRequired(path, label) {
  if (!existsSync(path)) {
    fail(`${label}: file not found: ${path}`);
    return null;
  }
  return readFileSync(path, 'utf8');
}

maybeRebuild();

const goldens = [
  ['home.html', join(fixturesDir, 'home.html')],
  ['docs-intro-start.html', join(fixturesDir, 'docs-intro-start.html')],
];

for (const [name, path] of goldens) {
  const html = readRequired(path, name);
  if (html) checkPage(html, `golden ${name}`);
}

if (existsSync(builtIntro)) {
  const html = readFileSync(builtIntro, 'utf8');
  checkPage(html, 'built docs/intro/start');
} else {
  fail(`built page missing: ${builtIntro}`);
}

if (existsSync(builtHome)) {
  const html = readFileSync(builtHome, 'utf8');
  checkPage(html, 'built home (/)');
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll SSG contract checks passed.');
process.exit(0);
