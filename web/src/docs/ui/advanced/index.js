import { page } from '@adukiorg/anza/ui';

page('/docs/ui/advanced', {
  tag: 'doc-ui-advanced',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
