import { page } from '@adukiorg/anza/ui';

page('/docs/workers/quickstart', {
  tag: 'doc-workers-quickstart',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
