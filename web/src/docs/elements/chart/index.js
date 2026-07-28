import { page } from '@adukiorg/anza/ui';

page('/docs/elements/chart', {
  tag: 'doc-elements-chart',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Chart — Anza',
    description: 'ui-chart — lightweight canvas bar/line chart with resize redraw.'
  }
}, import.meta.url);
