import { page } from '@anzaui/anza/ui';

page('/docs/elements/overlay', {
  tag: 'doc-elements-overlay',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Overlay — Anza',
    description: 'Overlay kit patterns: native popover/menu and dialog/drawer/sheet top-layer, tooltip escapeOverflow, toast body portal.'
  }
}, import.meta.url);
