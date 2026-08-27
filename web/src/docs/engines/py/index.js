import { page } from '@anzaui/anza/ui';

page('/docs/engines/py', {
  tag: 'doc-engines-py',
  via: ['main', 'docs', 'content'],
  seo: {
    title: 'Python STUI Engine — Anza',
    description: 'Zero-dependency Python standard library STUI engine for FastAPI, Flask, ASGI, and WSGI.'
  },
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
