import { page } from '@adukiorg/anza/ui';

page('/docs/elements/breadcrumb', {
  tag: 'doc-elements-breadcrumb',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Breadcrumb — Anza',
    description: 'ui-breadcrumb — accessible breadcrumb trail.'
  }
}, import.meta.url);
