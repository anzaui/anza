import { page } from '@anzaui/anza/ui';

page('/docs/animations/troubleshooting', {
  tag: 'doc-animations-troubleshooting',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
