import { page } from '@adukiorg/anza/ui';

page('/docs/index', {
  tag: 'doc-index',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' }
}, import.meta.url);
