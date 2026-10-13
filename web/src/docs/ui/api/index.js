import { page } from '@anzaui/anza/ui';

page('/docs/ui/api', {
  tag: 'doc-ui-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    description: 'Reference for the Anza UI layer: the ui facade, named exports, page/dock/view/part config, the element() spec, the hook context, on and watch.'
  }
}, import.meta.url);
