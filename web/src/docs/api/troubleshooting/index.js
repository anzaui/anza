import { page } from '@adukiorg/anza/ui';

page('/docs/api/troubleshooting', {
  tag: 'doc-api-troubleshooting',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
