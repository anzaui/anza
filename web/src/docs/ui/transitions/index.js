import { page } from '@anzaui/anza/ui';

page('/docs/ui/transitions', {
  tag: 'doc-ui-transitions',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    description: 'View transitions in the Anza UI layer: element-scoped dock swaps, transition(), runSwapTransition(), fallbacks and CSS control.'
  }
}, import.meta.url);
