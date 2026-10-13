import { page } from '@anzaui/anza/ui';

page('/docs/elements/icon', {
  tag: 'doc-elements-icon',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Icon — Anza',
    description: 'ui-icon — SVG sprite icon with name or href, size and stroke attributes, hidden from assistive tech unless labelled.'
  }
}, import.meta.url);
