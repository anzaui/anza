import { page } from '@anzaui/anza/ui';

page('/docs/elements/grid', {
  tag: 'doc-elements-grid',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Grid — Anza',
    description: 'ui-grid — CSS grid with a cols attribute (a count or a template) and a gap attribute.'
  }
}, import.meta.url);
