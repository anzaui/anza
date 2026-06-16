import { page } from '@adukiorg/anza/ui';

page('/docs/animations/sequence', {
  tag: 'doc-animations-sequence',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
