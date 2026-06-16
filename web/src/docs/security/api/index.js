import { page } from '@adukiorg/anza/ui';

page('/docs/security/api', {
  tag: 'doc-security-api',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
