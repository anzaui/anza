import { page } from '@anzaui/anza/ui';

page('/docs/elements/checkbox', {
  tag: 'doc-elements-checkbox',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Checkbox — Anza',
    description: 'ui-checkbox: a form-associated checkbox with an indeterminate state, required validation, change events and form reset.'
  }
}, import.meta.url);
