import { page } from '@anzaui/anza/ui';

page('/docs/elements/chart', {
  tag: 'doc-elements-chart',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Chart — Anza',
    description: 'ui-chart — canvas bar or line chart drawn from a JSON array, redrawn on resize and on attribute changes.'
  }
}, import.meta.url);
