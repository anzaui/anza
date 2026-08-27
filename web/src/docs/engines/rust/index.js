import { page } from '@anzaui/anza/ui';

page('/docs/engines/rust', {
  tag: 'doc-engines-rust',
  via: ['main', 'docs', 'content'],
  seo: {
    title: 'Rust STUI Engine — Anza',
    description: 'Zero-copy, cryptographically verified Server-Templated UI engine for Rust web frameworks.'
  },
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
