import { page } from '@adukiorg/anza/ui';

page('/docs/security/sanitize', {
  tag: 'doc-security-sanitize',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
