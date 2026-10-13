import { page } from '@anzaui/anza/ui';

page('/docs/elements/badge', {
  tag: 'doc-elements-badge',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Badge — Anza',
    description: 'ui-badge — compact status label with info, success, warning and error variants and sm or lg sizes.'
  }
}, import.meta.url);
