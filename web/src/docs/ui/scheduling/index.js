import { page } from '@adukiorg/anza/ui';

page('/docs/ui/scheduling', {
  tag: 'doc-ui-scheduling',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
