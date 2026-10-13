import { page } from '@anzaui/anza/ui';

page('/docs/elements/avatar', {
  tag: 'doc-elements-avatar',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Avatar — Anza',
    description: 'ui-avatar — profile image that falls back to initials from the name, with a size attribute and an automatic aria-label.'
  }
}, import.meta.url);
