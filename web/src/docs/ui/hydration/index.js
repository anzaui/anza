import { page } from '@anzaui/anza/ui';

page('/docs/ui/hydration', {
  tag: 'doc-ui-hydration',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Hydration (DSD adopt) — Anza',
    description: 'How Anza elements adopt open Declarative Shadow DOM from SSG or Mode B HTML: mount before fetching, no refetch in built apps, one mismatch re-render.'
  }
}, import.meta.url);
