import { page } from '@adukiorg/anza/ui';

page('/docs/elements/field', {
  tag: 'doc-elements-field',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Field — Anza',
    description: 'ui-field — field wrapper for label, hint, error, and controls.'
  }
}, import.meta.url);
