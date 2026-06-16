import { page } from '@adukiorg/anza/ui';

page('/docs/router/docks', {
  tag: 'doc-router-docks',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
