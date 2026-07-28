import { page } from '@adukiorg/anza/ui';

page('/docs/elements/header', {
  tag: 'doc-elements-header',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Header — Anza',
    description: 'ui-header — top bar with brand and actions slots.'
  }
}, import.meta.url);
