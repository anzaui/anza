import { page } from '@adukiorg/anza/ui';

page('/docs/elements/list', {
  tag: 'doc-elements-list',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'List — Anza',
    description: 'ui-list — list panel with optional bordered surface.'
  }
}, import.meta.url);
