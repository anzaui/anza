import { page } from '@anzaui/anza/ui';

page('/docs/ui/factory', {
  tag: 'doc-ui-factory',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    description: 'The element() factory behind page, dock, view and part: spec shape, resource loading, build-time inlining, HMR, define() and BaseElement.'
  }
}, import.meta.url);
