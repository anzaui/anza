import { page } from '@anzaui/anza/ui';

page('/docs/engines/contract', {
  tag: 'doc-engines-contract',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Engine Contract — Anza',
    description: 'The behaviour every Anza server engine (Rust, TypeScript, Python) implements identically: wire format v2, signatures, pages, values, escaping and errors.'
  }
}, import.meta.url);
