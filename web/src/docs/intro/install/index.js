import { page } from '@adukiorg/anza/ui';

page('/docs/intro/install', {
  tag: 'doc-intro-install',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css', './local.css']
}, import.meta.url);
