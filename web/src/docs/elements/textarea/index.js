import { page } from '@anzaui/anza/ui';

page('/docs/elements/textarea', {
  tag: 'doc-elements-textarea',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Textarea — Anza',
    description: 'ui-textarea: a form-associated multi-line text control with native validation, optional auto-resize and form reset.'
  }
}, import.meta.url);
