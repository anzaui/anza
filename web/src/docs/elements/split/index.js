import { page } from '@anzaui/anza/ui';

page('/docs/elements/split', {
  tag: 'doc-elements-split',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Split — Anza',
    description: 'ui-split — two-pane row with a 1-1, 1-2 or 2-1 ratio that stacks below 768px.'
  }
}, import.meta.url);
