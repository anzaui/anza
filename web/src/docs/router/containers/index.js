import { page } from '@adukiorg/anza/ui';

page('/docs/router/containers', {
  tag: 'doc-router-containers',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
