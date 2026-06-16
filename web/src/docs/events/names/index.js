import { page } from '@adukiorg/anza/ui';

page('/docs/events/names', {
  tag: 'doc-events-names',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
