import { page } from '@adukiorg/anza/ui';

page('/docs/elements/data', {
  tag: 'doc-elements-data',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Data — Anza',
    description: 'Tables, lists, cards, charts, and stats for displaying structured content.'
  }
}, import.meta.url);
