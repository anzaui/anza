import { page } from '@anzaui/anza/ui';

page('/docs/elements/toast', {
  tag: 'doc-elements-toast',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Toast — Anza',
    description: 'ui-toast — transient status notification with body portal and auto-dismiss.'
  }
}, import.meta.url);
