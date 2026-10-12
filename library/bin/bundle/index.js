#!/usr/bin/env node
/**
 * bin/bundle/index.js
 *
 * Production bundler step of `anza build` (internal; called by the Rust CLI,
 * not a public command). Runs Rolldown's JS API over the built dist modules:
 *
 *   node bin/bundle/index.js <plan.json> <manifest.json>
 *
 * plan.json (written by `anza build`):
 *   {
 *     "dist":      "/abs/dist",          // modules are read from here
 *     "project":   "/abs/project",       // rolldown is resolved from here
 *     "inputs":    ["/app.js"],          // site-root URLs of HTML module scripts
 *     "importmap": { "@anzaui/anza/ui": "/core/ui/index.js" },
 *     "groups":    { "/core/ui/index.js": "core", ... }  // module URL -> chunk name
 *   }
 *
 * Chunks are written to dist/assets/<name>-<hash>.js (minified ESM, content
 * hashed). Every `import.meta.url` is rewritten to the module's original
 * dist URL (relative to the chunk), so `new URL('./x.html', import.meta.url)`
 * and element base URLs keep resolving exactly as unbundled, under any
 * deploy base.
 *
 * manifest.json: { rolldown, chunks: [{ file, name, entry, modules, imports,
 * dynamicImports, externals }] } with site-root URLs (`/core/ui/index.js`)
 * and dist-relative chunk files (`assets/core-1a2b3c4d.js`).
 *
 * Exit codes: 0 ok, 1 bundling failed, 3 rolldown is not installed.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const [planPath, manifestPath] = process.argv.slice(2);
if (!planPath || !manifestPath) {
  console.error('usage: bundle <plan.json> <manifest.json>');
  process.exit(2);
}

const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const dist = resolve(plan.dist);

/** Loads rolldown from the project (its devDependency), then from here. */
async function loadRolldown() {
  for (const base of [join(plan.project, 'package.json'), import.meta.url]) {
    try {
      const path = createRequire(base).resolve('rolldown');
      return await import(pathToFileURL(path).href);
    } catch {
      // try the next location
    }
  }
  return null;
}

const urlOf = (id) => {
  const rel = relative(dist, id);
  if (rel.startsWith('..') || resolve(dist, rel) !== resolve(id)) return null;
  return '/' + rel.split(sep).join('/');
};
const fileOf = (url) => join(dist, ...url.replace(/^\/+/, '').split('/'));

const importmap = plan.importmap || {};
const groups = plan.groups || {};
const isLocal = (target) => typeof target === 'string' && target.startsWith('/') && !target.startsWith('//');

/** Bare specifiers through the import map; site-root paths into dist. */
const anzaResolve = {
  name: 'anza:resolve',
  resolveId(source) {
    if (Object.prototype.hasOwnProperty.call(importmap, source)) {
      const target = importmap[source];
      if (isLocal(target) && existsSync(fileOf(target))) return fileOf(target);
      return { id: source, external: true };
    }
    if (isLocal(source) && existsSync(fileOf(source))) return fileOf(source);
    if (/^(https?:)?\/\//.test(source)) return { id: source, external: true };
    return null;
  }
};

/** import.meta.url -> the module's original dist URL, relative to the chunk. */
const anzaMetaUrl = {
  name: 'anza:import-meta-url',
  transform(code, id) {
    if (!code.includes('import.meta.url')) return null;
    const url = urlOf(id);
    if (!url) return null;
    // Chunks live in /assets/, one level below the dist root.
    const original = JSON.stringify('..' + url);
    return {
      code: code.replace(/\bimport\.meta\.url\b/g, `new URL(${original}, import.meta.url).href`),
      map: null
    };
  }
};

const rolldown = await loadRolldown();
if (!rolldown) {
  console.error('rolldown is not installed (add it as a devDependency: npm i -D rolldown)');
  process.exit(3);
}

const input = {};
for (const url of plan.inputs) {
  const name = url.replace(/^\/+/, '').replace(/\.m?js$/, '').replace(/[^A-Za-z0-9_-]+/g, '-') || 'index';
  input[name] = fileOf(url);
}

const warnings = [];
try {
  const bundle = await rolldown.rolldown({
    input,
    platform: 'browser',
    // Entry chunks may export more than the entry module (chunk groups).
    preserveEntrySignatures: 'allow-extension',
    plugins: [anzaResolve, anzaMetaUrl],
    onLog(level, log) {
      if (level === 'warn') warnings.push(log.message);
    }
  });
  const output = await bundle.write({
    dir: dist,
    format: 'es',
    minify: true,
    sourcemap: false,
    hashCharacters: 'hex',
    entryFileNames: 'assets/[name]-[hash].js',
    chunkFileNames: 'assets/[name]-[hash].js',
    codeSplitting: {
      includeDependenciesRecursively: false,
      groups: [
        // Rolldown's own helpers ride with the shared runtime.
        { name: 'core', test: /rolldown[\\/]runtime/ },
        {
          debugName: 'anza',
          name(id) {
            const url = urlOf(id);
            return (url && groups[url]) || null;
          }
        }
      ]
    }
  });
  await bundle.close();

  const chunks = output.output
    .filter((item) => item.type === 'chunk')
    .map((chunk) => ({
      file: chunk.fileName,
      name: chunk.name,
      entry: chunk.isEntry && chunk.facadeModuleId ? urlOf(chunk.facadeModuleId) : null,
      modules: chunk.moduleIds.map(urlOf).filter(Boolean).sort(),
      imports: chunk.imports.filter((f) => f.startsWith('assets/')),
      dynamicImports: chunk.dynamicImports.filter((f) => f.startsWith('assets/')),
      externals: chunk.imports.filter((f) => !f.startsWith('assets/'))
    }))
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));

  writeFileSync(manifestPath, JSON.stringify({ rolldown: rolldown.VERSION, chunks, warnings }, null, 2));
} catch (err) {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
}
