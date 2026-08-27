import { page } from '@anzaui/anza/ui';

page('/docs/elements/form', {
  tag: 'doc-elements-form',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Form — Anza',
    description: 'ui-form — validates controls, submits JSON, optional offline queue.'
  }
}, import.meta.url);
