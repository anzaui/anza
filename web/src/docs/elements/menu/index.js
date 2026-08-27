import { page } from '@anzaui/anza/ui';

page('/docs/elements/menu', {
  tag: 'doc-elements-menu',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Menu — Anza',
    description: 'ui-menu — keyboard menu built on the Popover API.'
  }
}, import.meta.url);
