import { page } from '@anzaui/anza/ui';

page('/docs/elements/radio', {
  tag: 'doc-elements-radio',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Radio — Anza',
    description: 'ui-radio: a form-associated radio button. Radios with the same name in the same root form one group.'
  }
}, import.meta.url);
