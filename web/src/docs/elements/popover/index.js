import { page } from '@anzaui/anza/ui';

page('/docs/elements/popover', {
  tag: 'doc-elements-popover',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Popover — Anza',
    description: 'ui-popover — contextual overlay using the native Popover API.'
  }
}, import.meta.url);
