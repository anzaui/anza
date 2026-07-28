import { page } from '@adukiorg/anza/ui';

page('/docs/elements/button', {
  tag: 'doc-elements-button',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Button — Anza',
    description: 'ui-button — form-associated button with loading and disabled states.'
  }
}, import.meta.url);
