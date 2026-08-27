import { page } from '@anzaui/anza/ui';

/**
 * Phase 5 fixture: public parametric route with build-time expansion.
 * Pattern stays `ssg: false` for client matching; `/docs/ssg/expand/foo` is Mode A HTML.
 */
page('/docs/ssg/expand/:slug', {
  tag: 'doc-ssg-expand',
  via: ['main', 'docs', 'content'],
  params: [{ name: 'slug', type: String }],
  ssg: {
    expand: [{ slug: 'foo' }]
  },
  seo: {
    title: 'SSG expand: {{slug}} — Anza',
    description: 'Build-time parametric expansion example for slug {{slug}}.'
  },
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
