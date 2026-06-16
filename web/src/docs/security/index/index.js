import { page } from '@adukiorg/anza/ui';

page('/docs/security/index', {
  tag: 'doc-security-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
