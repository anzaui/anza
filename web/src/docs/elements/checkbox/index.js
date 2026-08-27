import { page } from '@anzaui/anza/ui';

page('/docs/elements/checkbox', {
  tag: 'doc-elements-checkbox',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Checkbox — Anza',
    description: 'ui-checkbox — form-participating tri-state checkbox.'
  }
}, import.meta.url);
