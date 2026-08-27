import { page } from '@anzaui/anza/ui';

page('/docs/elements/select', {
  tag: 'doc-elements-select',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Select — Anza',
    description: 'ui-select — form-participating dropdown using Popover API.'
  }
}, import.meta.url);
