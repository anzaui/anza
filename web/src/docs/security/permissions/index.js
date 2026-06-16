import { page } from '@adukiorg/anza/ui';

page('/docs/security/permissions', {
  tag: 'doc-security-permissions',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
