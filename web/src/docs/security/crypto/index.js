import { page } from '@adukiorg/anza/ui';

page('/docs/security/crypto', {
  tag: 'doc-security-crypto',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
