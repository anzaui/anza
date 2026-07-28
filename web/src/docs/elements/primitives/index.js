import { page } from '@adukiorg/anza/ui';

page('/docs/elements/primitives', {
  tag: 'doc-elements-primitives',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Primitives — Anza',
    description: 'Building blocks: buttons, icons, text, and other atomic UI pieces.'
  }
}, import.meta.url);
