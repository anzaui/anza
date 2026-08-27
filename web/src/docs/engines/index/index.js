import { page } from '@adukiorg/anza/ui';

page('/docs/engines/index', {
  tag: 'doc-engines-index',
  via: ['main', 'docs', 'content'],
  seo: {
    title: 'Server-Templated UI (STUI) Engines — Anza',
    description: 'High-performance STUI template and streaming engines for Rust, TypeScript, and Python.'
  },
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
