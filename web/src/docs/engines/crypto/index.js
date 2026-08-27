import { page } from '@anzaui/anza/ui';

page('/docs/engines/crypto', {
  tag: 'doc-engines-crypto',
  via: ['main', 'docs', 'content'],
  seo: {
    title: 'Cryptographic Verification — Anza',
    description: 'Asymmetric Ed25519 origin signing, HMAC-SHA256, and HKDF session stream keys for STUI security.'
  },
  template: { html: './index.html' },
  style: ['/styles/shared.css']
}, import.meta.url);
