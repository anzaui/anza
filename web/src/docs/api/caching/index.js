import { page } from '@adukiorg/anza/ui';

page('/docs/api/caching', {
  tag: 'doc-api-caching',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
