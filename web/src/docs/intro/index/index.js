import { page } from '@adukiorg/anza/ui';

page('/docs/intro/index', {
  tag: 'doc-intro-index',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
