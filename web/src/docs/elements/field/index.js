import { page } from '@anzaui/anza/ui';

page('/docs/elements/field', {
  tag: 'doc-elements-field',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Field — Anza',
    description: 'ui-field: a layout wrapper that places a label, hint, form control and error message in one column.'
  }
}, import.meta.url);
