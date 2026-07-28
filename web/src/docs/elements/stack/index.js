import { page } from '@adukiorg/anza/ui';

page('/docs/elements/stack', {
  tag: 'doc-elements-stack',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Stack — Anza',
    description: 'ui-stack — vertical flex stack with configurable gap.'
  }
}, import.meta.url);
