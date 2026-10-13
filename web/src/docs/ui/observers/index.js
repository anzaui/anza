import { page } from '@anzaui/anza/ui';

page('/docs/ui/observers', {
  tag: 'doc-ui-observers',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    description: 'Observer factories in the Anza UI layer: resize, intersection, mutation and performance observers that disconnect when an AbortSignal aborts.'
  }
}, import.meta.url);
