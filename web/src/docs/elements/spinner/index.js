import { page } from '@anzaui/anza/ui';

page('/docs/elements/spinner', {
  tag: 'doc-elements-spinner',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Spinner — Anza',
    description: 'ui-spinner — indeterminate loading spinner with reduced-motion support.'
  }
}, import.meta.url);
