import { page } from '@adukiorg/anza/ui';

page('/docs/animations/tokens', {
  tag: 'doc-animations-tokens',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
