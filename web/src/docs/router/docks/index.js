import { page } from '@adukiorg/anza/ui';

page('/docs/router/docks', {
  tag: 'doc-router-docks',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
