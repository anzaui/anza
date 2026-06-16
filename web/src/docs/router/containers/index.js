import { page } from '@adukiorg/anza/ui';

page('/docs/router/containers', {
  tag: 'doc-router-containers',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
