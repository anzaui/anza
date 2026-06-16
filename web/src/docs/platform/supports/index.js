import { page } from '@adukiorg/anza/ui';

page('/docs/platform/supports', {
  tag: 'doc-platform-supports',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
