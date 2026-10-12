import * as fs from 'node:fs';
import { AnzaError } from '../../errors/index.js';
import { all } from '../../engine/file/load.js';
import { listen, type FileWatcher } from '../../engine/file/watch.js';
import { CacheStore } from '../../engine/cache/store.js';
import { Engine } from '../../engine/cache/engine.js';
import { Signer, redact, type SignOptions } from '../../crypto/signer.js';

export interface SetupOptions {
  root: string;
  signing?: SignOptions;
  watch?: boolean;
  /** Fragment allowlist, see `EngineOptions.fragments`. */
  fragments?: string[];
  /**
   * HTML-escape `{{slot}}` values; `{{{slot}}}` stays raw. Off by default
   * (values are inserted as-is), see `docs/engines/contract.md`.
   */
  escape?: boolean;
}

export class Setup {
  public root: string;
  public signing: SignOptions;
  public watch: boolean;
  public fragments: string[];
  public escape: boolean;

  constructor(options: SetupOptions | string) {
    if (typeof options === 'string') {
      this.root = options;
      this.signing = { mode: 'none' };
      this.watch = false;
      this.fragments = [];
      this.escape = false;
    } else {
      this.root = options.root;
      this.signing = options.signing || { mode: 'none' };
      this.watch = Boolean(options.watch);
      this.fragments = [...(options.fragments ?? [])];
      this.escape = Boolean(options.escape);
    }
  }

  toJSON(): Record<string, unknown> {
    return { root: this.root, signing: redact(this.signing), watch: this.watch, fragments: this.fragments, escape: this.escape };
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
    const load = { escape: this.escape };
    const templates = await all(this.root, load);
    const cache = new CacheStore(templates);

    let watcher: FileWatcher | undefined;
    if (this.watch) {
      watcher = listen(this.root, async (_event, filename) => {
        try {
          const fresh = await all(this.root, load);
          cache.templates = fresh;
        } catch {
          // ignore transient read errors during editor file write
        }
      });
    }

    return new Engine(this.root, cache, signer, watcher, { fragments: this.fragments });
  }
}
