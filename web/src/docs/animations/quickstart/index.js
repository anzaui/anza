import { page } from '@adukiorg/anza/ui';

page('/docs/animations/quickstart', {
  tag: 'doc-animations-quickstart',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
