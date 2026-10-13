import { page } from '@anzaui/anza/ui';

page('/docs/ui/lifecycle', {
  tag: 'doc-ui-lifecycle',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    description: 'Lifecycle of Anza UI elements: load, connect, change and disconnect hooks, their order, the anza:ready event, soft-nav abort and memory safety.'
  }
}, import.meta.url);
