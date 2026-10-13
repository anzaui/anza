import { page } from '@anzaui/anza/ui';

page('/docs/elements/sheet', {
  tag: 'doc-elements-sheet',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Sheet — Anza',
    description: 'ui-sheet: modal bottom sheet on the native dialog with a drag handle to dismiss. Open with the open attribute or show().'
  }
}, import.meta.url);
