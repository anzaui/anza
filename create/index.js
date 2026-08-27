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
  // Fallback for local development — resolve relative to this script in the repo
  library = dirname(dirname(new URL(import.meta.url).pathname));
}

if (!library || !existsSync(join(library, 'package.json'))) {
  console.error('@anzaui/anza not found. Is it installed?');
  process.exit(1);
}

const { run } = await import(join(library, 'bin', 'create', 'index.js'));

const arg = process.argv[2];

if (!arg || arg === '--help' || arg === '-h') {
  console.log('Usage: npm create @anzaui/anza <name>');
  console.log('       npm create @anzaui/anza .   (scaffold in current dir)');
  process.exit(arg ? 0 : 1);
}

const target = resolve(arg);
const name = arg === '.' ? basename(process.cwd()) : basename(target);

if (existsSync(target) && arg !== '.') {
  console.error(`'${target}' already exists.`);
  process.exit(1);
}

run(target, name, library);
