import { page } from '@adukiorg/anza/ui';

page('/docs/security/crypto', {
  tag: 'doc-security-crypto',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
