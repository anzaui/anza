import { page } from '@adukiorg/anza/ui';

page('/docs/ui/scheduling', {
  tag: 'doc-ui-scheduling',
  via: ['main', 'dock-docs', 'dock-doccontent'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
