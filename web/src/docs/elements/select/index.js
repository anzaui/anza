import { page } from '@anzaui/anza/ui';

page('/docs/elements/select', {
  tag: 'doc-elements-select',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Select — Anza',
    description: 'ui-select: a form-associated dropdown that lists slotted options in a native popover and fires change on selection.'
  }
}, import.meta.url);
