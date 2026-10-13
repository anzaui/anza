import { page } from '@anzaui/anza/ui';

page('/docs/elements/surface', {
  tag: 'doc-elements-surface',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Surface — Anza',
    description: 'ui-surface — padded panel with flat, elevated or bordered variants built from surface tokens.'
  }
}, import.meta.url);
