import { page } from '@anzaui/anza/ui';

page('/docs/elements/scroll', {
  tag: 'doc-elements-scroll',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Scroll — Anza',
    description: 'ui-scroll — vertical scroll viewport that fills its parent, with optional mandatory scroll snapping.'
  }
}, import.meta.url);
