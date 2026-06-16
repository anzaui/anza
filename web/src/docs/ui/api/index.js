import { page } from '@adukiorg/anza/ui';

page('/docs/ui/api', {
  tag: 'doc-ui-api',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
