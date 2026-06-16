import { page } from '@adukiorg/anza/ui';

page('/docs/router/transitions', {
  tag: 'doc-router-transitions',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
