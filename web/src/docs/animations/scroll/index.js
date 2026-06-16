import { page } from '@adukiorg/anza/ui';

page('/docs/animations/scroll', {
  tag: 'doc-animations-scroll',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
