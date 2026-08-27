import { page } from '@anzaui/anza/ui';

page('/docs/elements/avatar', {
  tag: 'doc-elements-avatar',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Avatar — Anza',
    description: 'ui-avatar — profile picture with image or initials fallback.'
  }
}, import.meta.url);
