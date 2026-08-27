import { page } from '@anzaui/anza/ui';

page('/docs/security/troubleshooting', {
  tag: 'doc-security-troubleshooting',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
