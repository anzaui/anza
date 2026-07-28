import { page } from '@adukiorg/anza/ui';

page('/docs/elements/textarea', {
  tag: 'doc-elements-textarea',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Textarea — Anza',
    description: 'ui-textarea — form-participating multi-line text with validation and auto-resize.'
  }
}, import.meta.url);
