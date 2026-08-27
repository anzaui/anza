import * as fs from 'node:fs';
import { AnzaError } from '../../errors/index.js';
import { all } from '../../engine/file/load.js';
import { listen, type FileWatcher } from '../../engine/file/watch.js';
import { CacheStore } from '../../engine/cache/store.js';
import { Engine, type SignOptions } from '../../engine/cache/engine.js';

export interface SetupOptions {
  root: string;
  signing?: SignOptions;
  watch?: boolean;
}

export class Setup {
  public root: string;
  public signing: SignOptions;
  public watch: boolean;

  constructor(options: SetupOptions | string) {
    if (typeof options === 'string') {
      this.root = options;
      this.signing = { mode: 'none' };
      this.watch = false;
    } else {
      this.root = options.root;
      this.signing = options.signing || { mode: 'none' };
      this.watch = Boolean(options.watch);
    }
  }

  validate(): void {
    if (!this.root || !fs.existsSync(this.root)) {
      throw AnzaError.validation(`Template root directory does not exist: ${this.root}`);
    }
  }

  async run(): Promise<Engine> {
    this.validate();
    const templates = await all(this.root);
    const cache = new CacheStore(templates);

    let watcher: FileWatcher | undefined;
    if (this.watch) {
      watcher = listen(this.root, async (_event, filename) => {
        try {
          const fresh = await all(this.root);
          cache.templates = fresh;
        } catch {
          // ignore transient read errors during editor file write
        }
      });
    }

    return new Engine(this.root, cache, this.signing, watcher);
  }
}
