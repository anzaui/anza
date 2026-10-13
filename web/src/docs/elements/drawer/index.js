import { page } from '@anzaui/anza/ui';

page('/docs/elements/drawer', {
  tag: 'doc-elements-drawer',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Drawer — Anza',
    description: 'ui-drawer: modal side panel on the native dialog that slides in from the left or right. Open with the open attribute or show().'
  }
}, import.meta.url);
