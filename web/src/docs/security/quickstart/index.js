import { page } from '@adukiorg/anza/ui';

page('/docs/security/quickstart', {
  tag: 'doc-security-quickstart',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
