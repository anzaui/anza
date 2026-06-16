import { page } from '@adukiorg/anza/ui';

page('/docs/intro/structure', {
  tag: 'doc-intro-structure',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
