import { page } from '@adukiorg/anza/ui';

page('/docs/elements/input', {
  tag: 'doc-elements-input',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Input — Anza',
    description: 'ui-input — form-participating text control with ElementInternals validation.'
  }
}, import.meta.url);
