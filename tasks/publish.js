#!/usr/bin/env node
/**
 * tasks/publish.js
 *
 * Publishes the npm packages of the checked-out release, in dependency order:
 *
 *   1. @anzaui/anza         (library/, with the CLI binaries from the GitHub release)
 *   2. @anzaui/create-anza  (create/, depends on @anzaui/anza)
 *
 * @anzaui/engine is published from its own repository (anzaui/ts).
 *
 * Every tarball is packed and checked for the files it must ship before
 * anything is published, so a package can never go out without its binaries
 * or compiled code again. See NPM.md for the full release guide.
 *
 * Usage:
 *   node tasks/publish.js --dry              # download, build, pack and verify only
 *   node tasks/publish.js                    # publish (needs `npm login`)
 *   node tasks/publish.js --otp 123456       # npm two-factor code
 *   node tasks/publish.js --dry --tag v0.5.0 # take binaries from another release (dry runs only)
 */

import { execFileSync } from 'child_process';
import { chmodSync, existsSync, readFileSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const otp = valueOf('--otp');

const version = JSON.parse(readFileSync(join(ROOT, '.release-please-manifest.json'), 'utf8'))['.'];
const tag = valueOf('--tag') ?? `v${version}`;

// Asset names produced by .github/workflows/release.yml (matrix.binary).
const BINARIES = [
  'anza-linux-x64',
  'anza-linux-arm64',
  'anza-macos-x64',
  'anza-macos-arm64',
  'anza-windows-x64.exe',
];

const PACKAGES = [
  {
    name: '@anzaui/anza',
    dir: 'library',
    required: ['src/index.js', 'types/index.d.ts', 'bin/anza/index.js', ...BINARIES.map((b) => `bin/anza/${b}`)],
  },
  { name: '@anzaui/create-anza', dir: 'create', required: ['index.js'] },
];

function valueOf(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function run(cmd, cmdArgs, cwd = ROOT, opts = {}) {
  return execFileSync(cmd, cmdArgs, { cwd, encoding: 'utf8', stdio: opts.quiet ? 'pipe' : 'inherit', ...opts });
}

function fail(message) {
  console.error(`\npublish: ${message}`);
  process.exit(1);
}

function step(n, total, text) {
  console.log(`\nStep ${n}/${total}: ${text}`);
}

const TOTAL = dry ? 3 : 4;

// 1. Preconditions: the right commit, a clean tree, versions in sync.
step(1, TOTAL, `checking release ${tag} (version ${version})`);
if (valueOf('--tag') && !dry) fail('--tag is only allowed with --dry (real releases take the binaries of their own tag)');
if (!dry) {
  let head = '';
  try {
    head = run('git', ['describe', '--tags', '--exact-match', 'HEAD'], ROOT, { quiet: true }).trim();
  } catch {
    // not on a tag
  }
  if (head !== tag) fail(`HEAD must be the release tag ${tag} (got ${head || 'no tag'}). Run: git checkout ${tag}`);
  if (run('git', ['status', '--porcelain', '--untracked-files=no'], ROOT, { quiet: true }).trim()) {
    fail('the working tree has uncommitted changes');
  }
  try {
    run('npm', ['whoami'], ROOT, { quiet: true });
  } catch {
    fail('not logged in to npm. Run: npm login');
  }
}
run('node', ['tasks/versions-check.js']);

// 2. CLI binaries from the GitHub release.
step(2, TOTAL, `downloading CLI binaries from the ${tag} GitHub release`);
const binDir = join(ROOT, 'library', 'bin', 'anza');
try {
  run('gh', ['release', 'download', tag, '--pattern', 'anza-*', '--dir', binDir, '--clobber']);
} catch {
  fail(`could not download the binaries of ${tag}. Is the release published, and is \`gh auth status\` ok?`);
}
for (const bin of BINARIES) {
  const file = join(binDir, bin);
  if (!existsSync(file)) fail(`release ${tag} has no ${bin}`);
  if (statSync(file).size < 1024 * 1024) fail(`${bin} is smaller than 1 MB; the download looks broken`);
  if (!bin.endsWith('.exe')) chmodSync(file, 0o755);
}


// 3. Pack every package and check its contents before publishing any.
step(3, TOTAL, 'packing and verifying every tarball');
for (const pkg of PACKAGES) {
  const out = run('npm', ['pack', '--dry-run', '--json'], join(ROOT, pkg.dir), { quiet: true });
  const [info] = JSON.parse(out);
  if (info.name !== pkg.name) fail(`${pkg.dir} packs as ${info.name}, expected ${pkg.name}`);
  if (info.version !== version) fail(`${pkg.name} is ${info.version}, expected ${version}`);
  const files = new Set(info.files.map((f) => f.path));
  const missing = pkg.required.filter((f) => !files.has(f));
  if (missing.length) fail(`${pkg.name} would be published without: ${missing.join(', ')}`);
  console.log(`  ok  ${pkg.name}@${info.version}  ${info.entryCount} files, ${(info.size / 1048576).toFixed(1)} MB packed`);
}

if (dry) {
  console.log('\nDry run complete: every package has the files it needs. Nothing was published.');
  process.exit(0);
}

// 4. Publish in dependency order. Versions already on npm are skipped, so a
//    failed run can simply be repeated.
step(4, TOTAL, 'publishing to npm');
for (const pkg of PACKAGES) {
  let published = false;
  try {
    published = run('npm', ['view', `${pkg.name}@${version}`, 'version'], ROOT, { quiet: true }).trim() === version;
  } catch {
    // not published yet
  }
  if (published) {
    console.log(`  skip ${pkg.name}@${version} (already on npm)`);
    continue;
  }
  run('npm', ['publish', '--access', 'public', ...(otp ? ['--otp', otp] : [])], join(ROOT, pkg.dir));
  console.log(`  published ${pkg.name}@${version}`);
}

console.log(`\nDone. Check: npm view @anzaui/anza@${version} && npx -p @anzaui/anza@${version} anza --version`);
