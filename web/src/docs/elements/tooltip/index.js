import { page } from '@anzaui/anza/ui';

page('/docs/elements/tooltip', {
  tag: 'doc-elements-tooltip',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Tooltip — Anza',
    description: 'ui-tooltip: hover and focus hint that escapes overflow clipping through the top layer, with 12 placements.'
  }
}, import.meta.url);
