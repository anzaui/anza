import { page } from '@adukiorg/anza/ui';

page('/docs/elements/scroll', {
  tag: 'doc-elements-scroll',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Scroll — Anza',
    description: 'ui-scroll — scroll viewport with optional snap.'
  }
}, import.meta.url);
