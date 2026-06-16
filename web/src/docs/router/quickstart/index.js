import { page } from '@adukiorg/anza/ui';

page('/docs/router/quickstart', {
  tag: 'doc-router-quickstart',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
