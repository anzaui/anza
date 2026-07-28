import { page } from '@adukiorg/anza/ui';

page('/docs/elements/surface', {
  tag: 'doc-elements-surface',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Surface — Anza',
    description: 'ui-surface — styled surface for flat, elevated, or bordered panels.'
  }
}, import.meta.url);
