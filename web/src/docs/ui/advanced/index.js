import { page } from '@adukiorg/anza/ui';

page('/docs/ui/advanced', {
  tag: 'doc-ui-advanced',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
