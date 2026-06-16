import { page } from '@adukiorg/anza/ui';

page('/docs/ui/api', {
  tag: 'doc-ui-api',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
