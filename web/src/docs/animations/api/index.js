import { page } from '@adukiorg/anza/ui';

page('/docs/animations/api', {
  tag: 'doc-animations-api',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
