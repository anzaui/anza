import { page } from '@adukiorg/anza/ui';

page('/docs/styles/tokens', {
  tag: 'doc-styles-tokens',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
