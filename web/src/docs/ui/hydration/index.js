import { page } from '@adukiorg/anza/ui';

page('/docs/ui/hydration', {
  tag: 'doc-ui-hydration',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Hydration (DSD adopt) — Anza',
    description: 'How Anza adopts open Declarative Shadow DOM from SSG or Mode B HTML without wiping first paint.'
  }
}, import.meta.url);
