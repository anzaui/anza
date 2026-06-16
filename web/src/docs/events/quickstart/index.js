import { page } from '@adukiorg/anza/ui';

page('/docs/events/quickstart', {
  tag: 'doc-events-quickstart',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
