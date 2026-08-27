import { page } from '@anzaui/anza/ui';

page('/docs/intro/install', {
  tag: 'doc-intro-install',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
