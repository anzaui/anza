import { page } from '@anzaui/anza/ui';

page('/docs/elements/tabs', {
  tag: 'doc-elements-tabs',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Tabs — Anza',
    description: 'ui-tabs — tablist with roving tabindex, arrow, Home and End keys, and panels shown by the active value.'
  }
}, import.meta.url);
