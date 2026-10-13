import { page } from '@anzaui/anza/ui';

page('/docs/ui/form-associated', {
  tag: 'doc-ui-form-associated',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    description: 'Form-associated Anza UI elements: form: true, ElementInternals in the context, :state() props, and the reset, disabled and restore form hooks.'
  }
}, import.meta.url);
