import { page } from '@anzaui/anza/ui';

page('/docs/elements/progress', {
  tag: 'doc-elements-progress',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Progress — Anza',
    description: 'ui-progress: determinate progress bar with a label slot, a percentage readout and progressbar ARIA values.'
  }
}, import.meta.url);
