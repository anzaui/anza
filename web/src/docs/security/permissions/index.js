import { page } from '@anzaui/anza/ui';

page('/docs/security/permissions', {
  tag: 'doc-security-permissions',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
