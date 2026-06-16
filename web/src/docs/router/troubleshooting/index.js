import { page } from '@adukiorg/anza/ui';

page('/docs/router/troubleshooting', {
  tag: 'doc-router-troubleshooting',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
