import { page } from '@adukiorg/anza/ui';

page('/docs/intro/build', {
  tag: 'doc-intro-build',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
