import { page } from '@anzaui/anza/ui';

page('/docs/elements/input', {
  tag: 'doc-elements-input',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Input — Anza',
    description: 'ui-input: a form-associated single-line text control that mirrors a native input, its validation and form reset.'
  }
}, import.meta.url);
