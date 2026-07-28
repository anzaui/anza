import { page } from '@adukiorg/anza/ui';

page('/docs/ssg/contract', {
  tag: 'doc-ssg-contract',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Page HTML contract — Anza',
    description: 'Normative Mode A SSG and Mode B template HTML shape for SEO and DSD hydration.'
  }
}, import.meta.url);
