import { page } from '@adukiorg/anza/ui';

page('/docs/elements/upload', {
  tag: 'doc-elements-upload',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Upload — Anza',
    description: 'ui-upload — drag-and-drop file picker with optional upload progress.'
  }
}, import.meta.url);
