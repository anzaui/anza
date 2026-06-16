import { page } from '@adukiorg/anza/ui';

page('/docs/ui/lifecycle', {
  tag: 'doc-ui-lifecycle',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
