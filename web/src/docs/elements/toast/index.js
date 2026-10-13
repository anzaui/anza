import { page } from '@anzaui/anza/ui';

page('/docs/elements/toast', {
  tag: 'doc-elements-toast',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Toast — Anza',
    description: 'ui-toast: temporary status message that removes itself after a delay. showToast() stacks toasts in a fixed corner container.'
  }
}, import.meta.url);
