import * as crypto from 'node:crypto';
import { hmac, ed25519 } from '../../crypto/index.js';
import { Document, Envelope, Manifest } from '../../models/index.js';
import type { Params } from '../slot/index.js';
import type { Template } from '../file/load.js';
import type { FileWatcher } from '../file/watch.js';
import { CacheStore } from './store.js';
import { renderPageDocument } from '../../render/page.js';

export interface SignOptions {
  mode: 'ed25519' | 'hmac' | 'session' | 'none';
  secret?: string | Uint8Array;
  privateKey?: string | Uint8Array | crypto.KeyObject;
  publicKey?: string | Uint8Array | crypto.KeyObject;
  publishMeta?: boolean;
}

export class Engine {
  constructor(
    public root: string,
    public cache: CacheStore,
    public signing: SignOptions = { mode: 'none' },
    public watcher?: FileWatcher
  ) {}

  get(name: string): Template {
    return this.cache.get(name);
  }

  manifest(): Manifest {
    const manifest = new Manifest();
    for (const [name, tpl] of this.cache.templates.entries()) {
      manifest.insert(name, tpl.digest);
    }
    return manifest;
  }

  async signPayload(ts: number, slot: string, html: string): Promise<string | undefined> {
    const msg = `${ts}:${slot}:${html}`;
    switch (this.signing.mode) {
      case 'ed25519':
        if (!this.signing.privateKey) return undefined;
        return ed25519.sign(this.signing.privateKey, msg);
      case 'hmac':
        if (!this.signing.secret) return undefined;
        return hmac.sign(this.signing.secret, msg);
      case 'session':
      case 'none':
      default:
        return undefined;
    }
  }

  async renderFragment(templateName: string, slot: string, params?: Params): Promise<Envelope> {
    const tpl = this.get(templateName);
    const html = tpl.bind(params);
    const ts = Math.floor(Date.now() / 1000);
    const sig = await this.signPayload(ts, slot, html);

    return new Envelope(slot, ts, html, sig);
  }

  async renderPage(route: string, params?: Params): Promise<Document> {
    return renderPageDocument(this, route, params);
  }
}
