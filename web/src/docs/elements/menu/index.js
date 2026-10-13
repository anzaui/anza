import { page } from '@anzaui/anza/ui';

page('/docs/elements/menu', {
  tag: 'doc-elements-menu',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Menu — Anza',
    description: 'ui-menu: role=menu panel on the Popover API with arrow-key navigation, roving tabindex, and show(), hide(), toggle().'
  }
}, import.meta.url);
