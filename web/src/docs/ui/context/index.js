import { page } from '@anzaui/anza/ui';

page('/docs/ui/context', {
  tag: 'doc-ui-context',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    description: 'The context object passed to Anza UI hooks: el, ctrl, tags, refs, on, watch, internals, adopted, and the params and query of page load.'
  }
}, import.meta.url);
