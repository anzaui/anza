import * as fs from 'node:fs';

export type WatchCallback = () => void | Promise<void>;

/** Quiet period before a burst of file events triggers one reload. */
export const WATCH_DEBOUNCE_MS = 50;

/**
 * Watches a directory tree. A burst of events (an editor's save, a `git
 * checkout`) runs `callback` once, `debounceMs` after the last event, and
 * callbacks never overlap: each runs after the previous one has settled, so
 * the newest reload always lands last.
 */
export class FileWatcher {
  private watcher?: fs.FSWatcher;
  private timer?: ReturnType<typeof setTimeout>;
  private chain: Promise<void> = Promise.resolve();

  constructor(
    public dir: string,
    private callback: WatchCallback,
    private debounceMs = WATCH_DEBOUNCE_MS
  ) {
    try {
      this.watcher = fs.watch(dir, { recursive: true }, () => this.schedule());
    } catch {
      // Non-fatal if fs.watch fails on certain virtualized platforms
    }
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.chain = this.chain.then(this.callback).catch(() => undefined);
    }, this.debounceMs);
  }

  /** Resolves once every scheduled reload has run. */
  settled(): Promise<void> {
    return this.chain;
  }

  close(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
  }
}

export function listen(dir: string, callback: WatchCallback, debounceMs = WATCH_DEBOUNCE_MS): FileWatcher {
  return new FileWatcher(dir, callback, debounceMs);
}
