import { page } from '@adukiorg/anza/ui';

page('/docs/workers/offscreen', {
  tag: 'doc-workers-offscreen',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
