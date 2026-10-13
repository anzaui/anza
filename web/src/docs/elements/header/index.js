import { page } from '@anzaui/anza/ui';

page('/docs/elements/header', {
  tag: 'doc-elements-header',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Header — Anza',
    description: 'ui-header — top bar with a brand slot on the left and actions on the right.'
  }
}, import.meta.url);
