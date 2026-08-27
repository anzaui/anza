import * as fs from 'node:fs';

export type WatchCallback = (eventType: string, filename: string | null) => void;

export class FileWatcher {
  private watcher?: fs.FSWatcher;

  constructor(public dir: string, callback: WatchCallback) {
    try {
      this.watcher = fs.watch(dir, { recursive: true }, (event, filename) => {
        if (filename && filename.endsWith('.html')) {
          callback(event, filename);
        }
      });
    } catch {
      // Non-fatal if fs.watch fails on certain virtualized platforms
    }
  }

  close(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
  }
}

export function listen(dir: string, callback: WatchCallback): FileWatcher {
  return new FileWatcher(dir, callback);
}
