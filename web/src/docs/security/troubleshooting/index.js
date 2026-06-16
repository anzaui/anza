import { page } from '@adukiorg/anza/ui';

page('/docs/security/troubleshooting', {
  tag: 'doc-security-troubleshooting',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
