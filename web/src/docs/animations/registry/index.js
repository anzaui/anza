import { page } from '@adukiorg/anza/ui';

page('/docs/animations/registry', {
  tag: 'doc-animations-registry',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
