import { page } from '@anzaui/anza/ui';

page('/docs/engines/ts', {
  tag: 'doc-engines-ts',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'TypeScript & JS STUI Engine — Anza',
    description: 'Zero-dependency JIT template and STUI streaming engine for Node, Bun, Deno, and Edge runtimes.'
  }
}, import.meta.url);
