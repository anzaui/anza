import * as fs from 'node:fs';
import { AnzaError } from '../../errors/index.js';
import { all, DEFAULT_MAX_TEMPLATE_BYTES, type LoadOptions } from '../../engine/file/load.js';
import { listen, type FileWatcher } from '../../engine/file/watch.js';
import { CacheStore } from '../../engine/cache/store.js';
import { Engine } from '../../engine/cache/engine.js';
import { Signer, redact, type SignOptions } from '../../crypto/signer.js';

export interface SetupOptions {
  root: string;
  signing?: SignOptions;
  /** Reload templates when files under `root` change (debounced). */
  watch?: boolean;
  /** Fragment allowlist, see `EngineOptions.fragments`. */
  fragments?: string[];
  /**
   * HTML-escape `{{slot}}` values; `{{{slot}}}` stays raw. Off by default
   * (values are inserted as-is), see `docs/engines/contract.md`.
   */
  escape?: boolean;
  /** Refuse template files larger than this (default 1 MiB). */
  maxTemplateBytes?: number;
}

export class Setup {
  public root: string;
  public signing: SignOptions;
  public watch: boolean;
  public fragments: string[];
  public escape: boolean;
  public maxTemplateBytes: number;

  constructor(options: SetupOptions | string) {
    const o: SetupOptions = typeof options === 'string' ? { root: options } : options;
    this.root = o.root;
    this.signing = o.signing || { mode: 'none' };
    this.watch = Boolean(o.watch);
    this.fragments = [...(o.fragments ?? [])];
    this.escape = Boolean(o.escape);
    this.maxTemplateBytes = o.maxTemplateBytes ?? DEFAULT_MAX_TEMPLATE_BYTES;
  }

  toJSON(): Record<string, unknown> {
    return {
      root: this.root,
      signing: redact(this.signing),
      watch: this.watch,
      fragments: this.fragments,
      escape: this.escape,
      maxTemplateBytes: this.maxTemplateBytes,
    };
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `Setup ${JSON.stringify(this.toJSON())}`;
  }

  validate(): void {
    if (!this.root || !fs.existsSync(this.root)) {
      throw AnzaError.validation(`Template root directory does not exist: ${this.root}`);
    }
  }

  /** Validate the root and the signing keys, load every template, and start the watcher when `watch` is set. */
  async run(): Promise<Engine> {
    this.validate();
    const signer = Signer.from(this.signing);
    const load: LoadOptions = { escape: this.escape, maxBytes: this.maxTemplateBytes };
    const cache = new CacheStore(await all(this.root, load));

    let watcher: FileWatcher | undefined;
    if (this.watch) {
      // Debounced and serialized by the watcher: the newest tree always wins.
      watcher = listen(this.root, async () => {
        try {
          cache.templates = await all(this.root, load);
        } catch {
          // A half-written or oversized file: keep the last good tree; the
          // next event reloads it.
        }
      });
    }

    return new Engine(this.root, cache, signer, watcher, { fragments: this.fragments });
  }
}
