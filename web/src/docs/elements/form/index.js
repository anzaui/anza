import { page } from '@anzaui/anza/ui';

page('/docs/elements/form', {
  tag: 'doc-elements-form',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Form — Anza',
    description: 'ui-form: a wrapper that collects named form-associated controls into a JSON payload and can queue it while offline. Read the known issues.'
  }
}, import.meta.url);
