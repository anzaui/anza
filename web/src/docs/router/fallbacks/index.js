import { page } from '@adukiorg/anza/ui';

page('/docs/router/fallbacks', {
  tag: 'doc-router-fallbacks',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
