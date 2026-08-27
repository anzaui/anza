import type { Engine } from '../engine/cache/engine.js';
import type { Params } from '../engine/slot/index.js';
import { Document } from '../models/document.js';

export async function renderPageDocument(engine: Engine, route: string, params?: Params): Promise<Document> {
  const cleanRoute = route.replace(/^\/+|\/+$/g, '');
  const templateName = cleanRoute === '' ? 'pages/home.html' : `pages/${cleanRoute}.html`;

  let content = '';
  try {
    const pageTpl = engine.get(templateName);
    content = pageTpl.bind(params);
  } catch {
    try {
      const fallbackTpl = engine.get(`${cleanRoute}.html`);
      content = fallbackTpl.bind(params);
    } catch {
      try {
        const indexTpl = engine.get('pages/index.html');
        content = indexTpl.bind(params);
      } catch {
        content = `<div class="content">Route: ${route}</div>`;
      }
    }
  }

  // Check if layout/shell.html exists
  try {
    const shell = engine.get('layout/shell.html');
    const shellParams: Record<string, any> = {
      slot_main: content,
      content,
    };
    if (params && typeof params === 'object') {
      if (params instanceof Map) {
        for (const [k, v] of params.entries()) shellParams[k] = v;
      } else if (Array.isArray(params)) {
        for (const [k, v] of params) shellParams[k] = v;
      } else {
        Object.assign(shellParams, params);
      }
      shellParams.content = content;
      shellParams.slot_main = content;
    }
    const fullHtml = shell.bind(shellParams);
    return new Document(fullHtml);
  } catch {
    // Default open DSD container shell
    const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Anza App</title>
</head>
<body>
  <dock-main>
    <template shadowrootmode="open">
      <slot></slot>
    </template>
    ${content}
  </dock-main>
</body>
</html>`;
    return new Document(defaultHtml);
  }
}
