import { page } from '@anzaui/anza/ui';

page('/docs/elements/upload', {
  tag: 'doc-elements-upload',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Upload — Anza',
    description: 'ui-upload: a click or drag-and-drop file picker that either reports the chosen files or POSTs them with progress events.'
  }
}, import.meta.url);
