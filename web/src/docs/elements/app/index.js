import { page } from '@anzaui/anza/ui';

page('/docs/elements/app', {
  tag: 'doc-elements-app',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'App — Anza',
    description: 'ui-app — full-height application shell with header, sidebar and main slots that stacks below 768px.'
  }
}, import.meta.url);
