import { page } from '@anzaui/anza/ui';

page('/docs/elements/tabs', {
  tag: 'doc-elements-tabs',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Tabs — Anza',
    description: 'ui-tabs — accessible tablist with keyboard navigation.'
  }
}, import.meta.url);
