import { page } from '@anzaui/anza/ui';

page('/docs/elements/split', {
  tag: 'doc-elements-split',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Split — Anza',
    description: 'ui-split — two-pane split layout.'
  }
}, import.meta.url);
