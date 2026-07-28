import { page } from '@adukiorg/anza/ui';

page('/docs/elements/skeleton', {
  tag: 'doc-elements-skeleton',
  via: ['main', 'docs', 'content'],
  template: { html: './index.html' },
  style: ['/styles/shared.css'],
  seo: {
    title: 'Skeleton — Anza',
    description: 'ui-skeleton — loading placeholder with reduced-motion-aware shimmer.'
  }
}, import.meta.url);
