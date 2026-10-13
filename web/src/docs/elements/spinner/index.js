import { page } from '@anzaui/anza/ui';

page('/docs/elements/spinner', {
  tag: 'doc-elements-spinner',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Spinner — Anza',
    description: 'ui-spinner — indeterminate loading ring animated with the Web Animations API, paused under prefers-reduced-motion.'
  }
}, import.meta.url);
