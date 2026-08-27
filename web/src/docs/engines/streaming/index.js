import { page } from '@anzaui/anza/ui';

page('/docs/engines/streaming', {
  tag: 'doc-engines-streaming',
  via: ['main', 'docs', 'content'],
  seo: {
    title: 'Real-Time STUI Streaming — Anza',
    description: 'Server-Sent Events and WebSocket protocols pushing signed template updates to client shadow roots.'
  },
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
