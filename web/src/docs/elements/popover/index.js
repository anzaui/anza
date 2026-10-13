import { page } from '@anzaui/anza/ui';

page('/docs/elements/popover', {
  tag: 'doc-elements-popover',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Popover — Anza',
    description: 'ui-popover: light-dismiss panel on the native Popover API, with show(), hide(), toggle() and a toggle event. Polyfilled where missing.'
  }
}, import.meta.url);
