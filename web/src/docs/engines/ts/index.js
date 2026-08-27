import { page } from '@adukiorg/anza/ui';

page('/docs/engines/ts', {
  tag: 'doc-engines-ts',
  via: ['main', 'docs', 'content'],
  seo: {
    title: 'TypeScript & JS STUI Engine — Anza',
    description: 'Zero-dependency JIT template and STUI streaming engine for Node, Bun, Deno, and Edge runtimes.'
  },
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
