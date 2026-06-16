import { page } from '@adukiorg/anza/ui';

page('/docs/animations/troubleshooting', {
  tag: 'doc-animations-troubleshooting',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
