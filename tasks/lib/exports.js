/**
 * tasks/lib/exports.js
 *
 * Resolves the public export names of @anzaui/anza per package.json subpath,
 * by static analysis with the TypeScript compiler API (no module is executed).
 * `export *` chains are followed. Names that two `export *` clauses both
 * provide are ambiguous at runtime (the ES spec drops them from the module
 * namespace), so they are reported separately and are not importable.
 *
 * Shared by tasks/doc-imports-check.js and tasks/types-check.js.
 */

import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LIB = join(ROOT, 'library');
export const PKG = JSON.parse(readFileSync(join(LIB, 'package.json'), 'utf8'));

// typescript is a library devDependency (run `npm ci` in library/ first).
const require = createRequire(join(LIB, 'package.json'));
const ts = require('typescript');

/**
 * Every exports-map key → { pattern, runtime, types } (absolute paths or null).
 * @returns {Map<string, {pattern: boolean, runtime: string|null, types: string|null}>}
 */
export function subpaths() {
  const out = new Map();
  for (const [key, value] of Object.entries(PKG.exports)) {
    if (key.includes('*')) {
      out.set(key, { pattern: true, runtime: null, types: null });
      continue;
    }
    const runtime = typeof value === 'string' ? value : value.default;
    const types = typeof value === 'string' ? null : value.types ?? null;
    out.set(key, {
      pattern: false,
      runtime: runtime ? join(LIB, runtime) : null,
      types: types ? join(LIB, types) : null
    });
  }
  return out;
}

/** `@anzaui/anza/router` → `./router` (null if not this package). */
export function keyOf(specifier) {
  if (specifier === PKG.name) return '.';
  if (!specifier.startsWith(PKG.name + '/')) return null;
  return '.' + specifier.slice(PKG.name.length);
}

/** True when the specifier is reachable through the exports map. */
export function isExported(specifier) {
  const key = keyOf(specifier);
  if (!key) return false;
  if (PKG.exports[key]) return true;
  return Object.keys(PKG.exports).some((k) => {
    if (!k.includes('*')) return false;
    const [pre, post] = k.split('*');
    return key.startsWith(pre) && key.endsWith(post) && key.length > pre.length + post.length;
  });
}

const SCRIPT = /\.(m?js|d\.ts)$/;

/**
 * Builds one program over `files` and returns a reader that lists the export
 * names of any of those files: `{ names, ambiguous }` (or null if unknown).
 *
 * @param {string[]} files
 */
export function exportReader(files) {
  const program = ts.createProgram(
    files.filter((f) => f && SCRIPT.test(f) && existsSync(f)),
    {
      allowJs: true,
      checkJs: false,
      noEmit: true,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowImportingTsExtensions: true,
      skipLibCheck: true
    }
  );
  const checker = program.getTypeChecker();

  return (file) => {
    const sf = program.getSourceFile(file);
    if (!sf) return null;
    const sym = checker.getSymbolAtLocation(sf);
    if (!sym) return { names: new Set(), ambiguous: new Set() };
    const ambiguous = ambiguousStars(sf, checker);
    const names = new Set();
    const typeOnly = new Set();
    for (const s of checker.getExportsOfModule(sym)) {
      const name = s.escapedName.toString();
      if (ambiguous.has(name)) continue;
      names.add(name);
      const real = s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;
      if (!(real.flags & ts.SymbolFlags.Value)) typeOnly.add(name);
    }
    return { names, ambiguous, typeOnly };
  };
}

/**
 * Names provided by two or more `export * from` clauses with different
 * bindings, and not re-exported explicitly by the module itself.
 * TypeScript silently keeps the first one; the browser drops the name.
 */
function ambiguousStars(sf, checker) {
  const explicit = new Set();
  const seen = new Map();
  const clashes = new Set();

  for (const st of sf.statements) {
    if (!ts.isExportDeclaration(st)) {
      if (st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isVariableStatement(st)) {
          for (const d of st.declarationList.declarations) {
            if (ts.isIdentifier(d.name)) explicit.add(d.name.text);
          }
        } else if (st.name && ts.isIdentifier(st.name)) {
          explicit.add(st.name.text);
        }
      }
      continue;
    }
    if (st.exportClause) {
      if (ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) explicit.add(el.name.text);
      } else {
        explicit.add(st.exportClause.name.text); // export * as ns
      }
      continue;
    }
    if (!st.moduleSpecifier) continue;
    const target = checker.getSymbolAtLocation(st.moduleSpecifier);
    if (!target) continue;
    for (const s of checker.getExportsOfModule(target)) {
      const name = s.escapedName.toString();
      if (name === 'default') continue;
      const real = s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;
      const prev = seen.get(name);
      if (prev && prev !== real) clashes.add(name);
      else if (!prev) seen.set(name, real);
    }
  }

  for (const n of explicit) clashes.delete(n);
  return clashes;
}
