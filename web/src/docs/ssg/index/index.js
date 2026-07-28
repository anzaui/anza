import { page } from '@adukiorg/anza/ui';

page('/docs/ssg/index', {
  tag: 'doc-ssg-index',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'SSG & SEO — Anza',
    description: 'Mode A/B SSG overview: portable site-root, open DSD, expand, sitemap, and hydration.'
  }
}, import.meta.url);
