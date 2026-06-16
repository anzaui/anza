import { page } from '@adukiorg/anza/ui';

page('/docs/workers/index', {
  tag: 'doc-workers-index',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
