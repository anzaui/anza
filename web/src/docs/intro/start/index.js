import { page } from '@adukiorg/anza/ui';

page('/docs/intro/start', {
  tag: 'doc-intro-start',
  via: ['main', 'docs', 'content'],
  seo: {
    title: 'Getting Started — Anza',
    description: 'Create a project, run the dev server, and ship your first Anza page.'
  },
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
