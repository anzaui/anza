import { page } from '@anzaui/anza/ui';

page('/docs/elements/toggle', {
  tag: 'doc-elements-toggle',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Toggle — Anza',
    description: 'ui-toggle: a form-associated on/off switch with role=switch, change events, form reset and an on custom state.'
  }
}, import.meta.url);
