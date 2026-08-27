import { page } from '@anzaui/anza/ui';

page('/docs/elements/drawer', {
  tag: 'doc-elements-drawer',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Drawer — Anza',
    description: 'ui-drawer — side panel overlay using native dialog showModal.'
  }
}, import.meta.url);
