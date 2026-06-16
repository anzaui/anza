import { page } from '@adukiorg/anza/ui';

page('/docs/intro/start', {
  tag: 'doc-intro-start',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
