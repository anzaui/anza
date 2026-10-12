import { page } from '@anzaui/anza/ui';

page('/docs/engines/index', {
  tag: 'doc-engines-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Server-Templated UI (STUI) Engines — Anza',
    description: 'High-performance STUI template and streaming engines for Rust, TypeScript, and Python.'
  }
}, import.meta.url);
