import { page } from '@adukiorg/anza/ui';

page('/docs/security/seal', {
  tag: 'doc-security-seal',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
