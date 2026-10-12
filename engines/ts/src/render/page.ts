import type { Engine } from '../engine/cache/engine.js';
import type { Template } from '../engine/file/load.js';
import { pageTemplate } from '../engine/name.js';
import type { Params } from '../engine/slot/index.js';
import { AnzaError } from '../errors/index.js';
import { Document } from '../models/document.js';

/** The document used when the root has no `layout/shell.html`, split around the page. */
export const DEFAULT_SHELL: readonly [string, string] = [
  '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>Anza App</title>\n</head>\n<body>\n  <dock-main>\n    <template shadowrootmode="open">\n      <slot></slot>\n    </template>\n    ',
  '\n  </dock-main>\n</body>\n</html>',
];

function find(engine: Engine, name: string): Template | undefined {
  return engine.cache.has(name) ? engine.get(name) : undefined;
}

/**
 * Render the page for `route` (see `docs/engines/contract.md`):
 * 1. `/` is `pages/home.html`, `/a/b` is `pages/a/b.html`.
 * 2. Unknown routes use `pages/index.html` (the catch-all) when it exists.
 * 3. Otherwise (or for a malformed route) it throws `NOT_FOUND`.
 * 4. The page goes into `layout/shell.html` as `{{content}}`, or into a
 *    minimal default document when there is no shell.
 */
export async function renderPageDocument(engine: Engine, route: string, params?: Params): Promise<Document> {
  const name = pageTemplate(route);
  const page = name === null ? undefined : find(engine, name) ?? find(engine, 'pages/index.html');
  if (!page) throw AnzaError.notFound('Page not found');
  const content = page.bind(params);

  const shell = find(engine, 'layout/shell.html');
  if (!shell) return new Document(DEFAULT_SHELL[0] + content + DEFAULT_SHELL[1]);

  const shellParams = new Map<string, unknown>();
  if (params instanceof Map) {
    for (const [k, v] of params) shellParams.set(k, v);
  } else if (Array.isArray(params)) {
    for (const [k, v] of params) shellParams.set(k, v);
  } else if (params && typeof params === 'object') {
    for (const k of Object.keys(params)) shellParams.set(k, (params as Record<string, unknown>)[k]);
  }
  shellParams.set('content', content);
  return new Document(shell.bind(shellParams));
}
