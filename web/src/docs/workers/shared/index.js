import { page } from '@adukiorg/anza/ui';

page('/docs/workers/shared', {
  tag: 'doc-workers-shared',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
