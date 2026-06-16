import { page } from '@adukiorg/anza/ui';

page('/docs/ui/index', {
  tag: 'doc-ui-index',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
