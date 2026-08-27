import { page } from '@anzaui/anza/ui';

page('/docs/elements/radio', {
  tag: 'doc-elements-radio',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Radio — Anza',
    description: 'ui-radio — form-participating radio with name-group coordination.'
  }
}, import.meta.url);
