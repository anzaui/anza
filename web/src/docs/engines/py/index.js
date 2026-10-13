import { page } from '@anzaui/anza/ui';

page('/docs/engines/py', {
  tag: 'doc-engines-py',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Python STUI Engine — Anza',
    description: 'Python STUI engine for FastAPI, Flask, ASGI, and WSGI, built on the standard library and cryptography.'
  }
}, import.meta.url);
