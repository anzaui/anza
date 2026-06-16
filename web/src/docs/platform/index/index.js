import { page } from '@adukiorg/anza/ui';

page('/docs/platform/index', {
  tag: 'doc-platform-index',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
