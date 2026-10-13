import { page } from '@anzaui/anza/ui';

page('/docs/ssg', {
  tag: 'doc-ssg',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'SSG & SEO — Anza',
    description: 'Mode A/B SSG overview: site-root dist, open DSD, page SEO fields, ssg.json, 404 page, sitemap and parametric expand.'
  }
}, import.meta.url);
