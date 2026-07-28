import { page } from '@adukiorg/anza/ui';

page('/docs/elements/tooltip', {
  tag: 'doc-elements-tooltip',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Tooltip — Anza',
    description: 'ui-tooltip — hover/focus hint with overflow-escape positioning.'
  }
}, import.meta.url);
