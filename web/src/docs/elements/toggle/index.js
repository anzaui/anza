import { page } from '@anzaui/anza/ui';

page('/docs/elements/toggle', {
  tag: 'doc-elements-toggle',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Toggle — Anza',
    description: 'ui-toggle — form-participating switch with role=switch.'
  }
}, import.meta.url);
