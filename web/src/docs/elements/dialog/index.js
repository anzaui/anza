import { page } from '@anzaui/anza/ui';

page('/docs/elements/dialog', {
  tag: 'doc-elements-dialog',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Dialog — Anza',
    description: 'ui-dialog — modal overlay wrapping the native dialog element.'
  }
}, import.meta.url);
