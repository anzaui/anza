import { Signer, type SignOptions } from '../../crypto/signer.js';
import { Document, Envelope, Manifest } from '../../models/index.js';
import type { Params } from '../slot/index.js';
import type { Template } from '../file/load.js';
import type { FileWatcher } from '../file/watch.js';
import { CacheStore } from './store.js';
import { renderPageDocument } from '../../render/page.js';

export type { SignOptions };

export class Engine {
  /** The validated signing key (never printed). */
  readonly signer: Signer;

  constructor(
    public root: string,
    public cache: CacheStore,
    signing: SignOptions | Signer = { mode: 'none' },
    public watcher?: FileWatcher
  ) {
    this.signer = signing instanceof Signer ? signing : Signer.from(signing);
  }

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
    return this.signer.sign(`${ts}:${slot}:${html}`);
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
