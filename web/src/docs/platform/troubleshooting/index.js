import { page } from '@adukiorg/anza/ui';

page('/docs/platform/troubleshooting', {
  tag: 'doc-platform-troubleshooting',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
