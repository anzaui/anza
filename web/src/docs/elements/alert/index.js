import { page } from '@adukiorg/anza/ui';

page('/docs/elements/alert', {
  tag: 'doc-elements-alert',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Alert — Anza',
    description: 'ui-alert — inline severity notification with optional dismiss.'
  }
}, import.meta.url);
