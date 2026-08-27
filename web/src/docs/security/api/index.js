import { page } from '@anzaui/anza/ui';

page('/docs/security/api', {
  tag: 'doc-security-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
