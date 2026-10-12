import { page } from '@anzaui/anza/ui';

page('/docs/intro/start', {
  tag: 'doc-intro-start',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Getting Started — Anza',
    description: 'Create a project, run the dev server, and ship your first Anza page.'
  }
}, import.meta.url);
