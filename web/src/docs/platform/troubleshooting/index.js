import { page } from '@adukiorg/anza/ui';

page('/docs/platform/troubleshooting', {
  tag: 'doc-platform-troubleshooting',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
