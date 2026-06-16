import { page } from '@adukiorg/anza/ui';

page('/docs/platform/quickstart', {
  tag: 'doc-platform-quickstart',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
