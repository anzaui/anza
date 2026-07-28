/**
 * tests/core/ui/sanitize.test.js
 *
 * SSG document collision guard used when CSR fetches index.html as a template.
 */

import {
  collectRefNames,
  hasStructuralElements,
  sanitizeTemplateHtml
} from '../../../src/core/ui/define/utils.js';

describe('sanitizeTemplateHtml / hydration helpers', () => {
  it('passes plain fragments through unchanged', () => {
    const html = '<h1 ref="title">Hi</h1>';
    if (sanitizeTemplateHtml(html, 'doc-x') !== html) {
      throw new Error('Expected plain fragment passthrough');
    }
    if (sanitizeTemplateHtml('') !== '') {
      throw new Error('Expected empty string passthrough');
    }
  });

  it('extracts open-DSD leaf body and strips style from colliding SSG docs', () => {
    const ssg = `<!DOCTYPE html><html><body><dock-main><dock-docs></dock-docs>
<doc-sanitize-leaf class="page-content"><template shadowrootmode="open">
<style>.x{}</style><h1 id="ok" ref="h">OK</h1>
</template></doc-sanitize-leaf></dock-main></body></html>`;

    const out = sanitizeTemplateHtml(ssg, 'doc-sanitize-leaf');
    if (!out.includes('id="ok"') || !out.includes('ref="h"')) {
      throw new Error(`Expected leaf body, got: ${out}`);
    }
    if (out.includes('dock-docs') || out.includes('<style') || out.includes('DOCTYPE')) {
      throw new Error(`Expected docks/style/doctype stripped, got: ${out}`);
    }
  });

  it('refuses SSG shells without a matching leaf DSD and returns empty', () => {
    const errors = [];
    const original = console.error;
    console.error = (msg) => { errors.push(String(msg)); };

    try {
      const out = sanitizeTemplateHtml(
        '<!DOCTYPE html><html><body><dock-main></dock-main></body></html>',
        'doc-missing-leaf'
      );
      if (out !== '') {
        throw new Error(`Expected refuse path to return empty string, got: ${out}`);
      }
      if (!errors.some((e) => e.includes('Refusing full HTML document'))) {
        throw new Error('Expected console.error on refuse path');
      }
    } finally {
      console.error = original;
    }
  });

  it('detects structural elements and collects ref names', () => {
    const root = document.createElement('div');
    root.innerHTML = '<style></style><span ref="a"></span><button ref="b"></button>';

    if (!hasStructuralElements(root)) {
      throw new Error('Expected structural elements beyond style');
    }

    const styleOnly = document.createElement('div');
    styleOnly.innerHTML = '<style></style>';
    if (hasStructuralElements(styleOnly)) {
      throw new Error('Expected style-only root to be non-structural');
    }

    const refs = collectRefNames(root);
    if (refs.join(',') !== 'a,b') {
      throw new Error(`Expected refs a,b got ${refs.join(',')}`);
    }
  });
});
