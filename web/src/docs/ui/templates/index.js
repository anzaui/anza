import { page } from '@adukiorg/anza/ui';

page('/docs/ui/templates', {
  tag: 'doc-ui-templates',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
