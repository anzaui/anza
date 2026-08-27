import { page } from '@anzaui/anza/ui';

page('/docs/elements/grid', {
  tag: 'doc-elements-grid',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Grid — Anza',
    description: 'ui-grid — responsive CSS grid with columns and gap.'
  }
}, import.meta.url);
