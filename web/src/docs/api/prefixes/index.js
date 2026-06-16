import { page } from '@adukiorg/anza/ui';

page('/docs/api/prefixes', {
  tag: 'doc-api-prefixes',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
