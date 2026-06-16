import { page } from '@adukiorg/anza/ui';

page('/docs/animations/animate', {
  tag: 'doc-animations-animate',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
