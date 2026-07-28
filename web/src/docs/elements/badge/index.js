import { page } from '@adukiorg/anza/ui';

page('/docs/elements/badge', {
  tag: 'doc-elements-badge',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Badge — Anza',
    description: 'ui-badge — compact label indicator with semantic variants and size scaling.'
  }
}, import.meta.url);
