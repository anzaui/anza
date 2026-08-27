import { page } from '@anzaui/anza/ui';

page('/docs/elements/forms', {
  tag: 'doc-elements-forms',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Forms — Anza',
    description: 'Form-associated controls that participate in native form submission and validation.'
  }
}, import.meta.url);
