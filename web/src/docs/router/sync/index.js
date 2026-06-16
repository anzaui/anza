import { page } from '@adukiorg/anza/ui';

page('/docs/router/sync', {
  tag: 'doc-router-sync',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
