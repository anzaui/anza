import { page } from '@anzaui/anza/ui';

page('/docs/ui/props', {
  tag: 'doc-ui-props',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    description: 'Reactive props on Anza UI elements: types, attribute reflection, :state(), initial values, route params and update batching.'
  }
}, import.meta.url);
