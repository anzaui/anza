import { page } from '@adukiorg/anza/ui';

page('/docs/animations/tokens', {
  tag: 'doc-animations-tokens',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
