import { page } from '@anzaui/anza/ui';

page('/docs/elements/dialog', {
  tag: 'doc-elements-dialog',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Dialog — Anza',
    description: 'ui-dialog: modal overlay around the native dialog element. Open it with the open attribute or showModal(), close it with close(returnValue).'
  }
}, import.meta.url);
