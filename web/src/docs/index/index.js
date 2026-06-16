import { page } from '@adukiorg/anza/ui';

page('/docs/index', {
  tag: 'doc-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' }
}, import.meta.url);
