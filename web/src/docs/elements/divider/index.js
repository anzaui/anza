import { page } from '@anzaui/anza/ui';

page('/docs/elements/divider', {
  tag: 'doc-elements-divider',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Divider — Anza',
    description: 'ui-divider — separating line with orientation and spacing tokens.'
  }
}, import.meta.url);
