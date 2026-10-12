#!/usr/bin/env node
/**
 * create/index.js
 *
 * Entry point for `npm create @anzaui/anza <name>`.
 * Resolves the installed `@anzaui/anza` package and delegates to its
 * scaffold logic.
 */

import { createRequire } from 'module';
import { dirname, join, resolve, basename } from 'path';
import { existsSync } from 'fs';

const require = createRequire(import.meta.url);

let library;
try {
  const anzaPkg = require.resolve('@anzaui/anza/package.json');
  library = dirname(anzaPkg);
} catch (_) {
  // Fallback for local development — the library lives beside create/ in the repo
  library = join(dirname(dirname(new URL(import.meta.url).pathname)), 'library');
}

if (!library || !existsSync(join(library, 'package.json'))) {
  console.error('@anzaui/anza not found. Is it installed?');
  process.exit(1);
}

const { run } = await import(join(library, 'bin', 'create', 'index.js'));

const args = process.argv.slice(2);
const force = args.includes('--force');
const arg = args.find((a) => !a.startsWith('-')) ?? args.find((a) => a === '--help' || a === '-h');

if (!arg || arg === '--help' || arg === '-h') {
  console.log('Usage: npm create @anzaui/anza <name> [-- --force]');
  console.log('       npm create @anzaui/anza .   (scaffold in current dir)');
  console.log('Refuses to overwrite existing files unless --force is given.');
  process.exit(arg ? 0 : 1);
}

const target = resolve(arg);
const name = arg === '.' ? basename(process.cwd()) : basename(target);

run(target, name, library, { force });
