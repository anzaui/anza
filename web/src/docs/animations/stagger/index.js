import { page } from '@adukiorg/anza/ui';

page('/docs/animations/stagger', {
  tag: 'doc-animations-stagger',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
