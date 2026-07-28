import { page } from '@adukiorg/anza/ui';

page('/docs/elements/sheet', {
  tag: 'doc-elements-sheet',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Sheet — Anza',
    description: 'ui-sheet — bottom sheet overlay with drag-to-dismiss.'
  }
}, import.meta.url);
