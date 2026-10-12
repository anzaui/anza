#!/usr/bin/env node
/**
 * bin/create/index.js
 *
 * Scaffolds a new anza app project in the given directory.
 * Re-exports run, copy, and write for programmatic use.
 */

import { resolve, basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { run } from './run.js';

export { run } from './run.js';
export { copy } from './copy.js';
export { write } from './write.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const args  = process.argv.slice(2);
const force = args.includes('--force');
const arg   = args.find((a) => !a.startsWith('-')) ?? args.find((a) => a === '--help' || a === '-h');

// CLI entry only when executed directly
const isCli = process.argv[1] === __filename;

if (isCli) {
  if (!arg || arg === '--help' || arg === '-h') {
    console.log('Usage: npx anza-create <name> [--force]');
    console.log('       npx anza-create .     (scaffold in current dir)');
    console.log('Refuses to overwrite existing files unless --force is given.');
    process.exit(arg ? 0 : 1);
  }

  const target = resolve(arg);
  const name   = arg === '.' ? basename(process.cwd()) : basename(target);

  const library = join(__dirname, '..', '..');

  run(target, name, library, { force });
}
