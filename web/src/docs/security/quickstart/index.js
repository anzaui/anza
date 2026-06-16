import { page } from '@adukiorg/anza/ui';

page('/docs/security/quickstart', {
  tag: 'doc-security-quickstart',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
