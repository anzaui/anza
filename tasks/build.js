#!/usr/bin/env node
/**
 * tasks/build.js
 *
 * Builds the anza Rust binary in release mode.
 * Run from repo root: node tasks/build.js
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const root = dirname(fileURLToPath(import.meta.url));
const tools = join(root, '..', 'tools');
const targetDir = join(tools, 'target');

if (!existsSync(join(tools, 'Cargo.toml'))) {
  console.error('Error: tools/Cargo.toml not found. Run from repo root.');
  process.exit(1);
}

console.log('Building anza binary (release)...');
execSync('cargo build --release', {
  cwd: tools,
  stdio: 'inherit',
  env: { ...process.env, CARGO_TARGET_DIR: targetDir },
});

const out = join(targetDir, 'release', 'anza');
console.log(`\nDone → ${out}`);
