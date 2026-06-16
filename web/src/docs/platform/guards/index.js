import { page } from '@adukiorg/anza/ui';

page('/docs/platform/guards', {
  tag: 'doc-platform-guards',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
