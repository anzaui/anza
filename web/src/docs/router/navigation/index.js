import { page } from '@adukiorg/anza/ui';

page('/docs/router/navigation', {
  tag: 'doc-router-navigation',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
