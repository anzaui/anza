import threading
from pathlib import Path
from typing import Callable, Optional, Union

#: How often the polling watcher scans the template root, in seconds.
POLL_SECS = 0.2

Snapshot = dict[str, tuple[int, int]]


def snapshot(root_dir: Union[str, Path]) -> Snapshot:
    """``(mtime_ns, size)`` of every ``.html`` file under the root."""
    from .load import files

    root = Path(root_dir)
    out: Snapshot = {}
    for rel in files(root):
        try:
            st = (root / rel).stat()
        except OSError:
            continue
        out[rel.as_posix()] = (st.st_mtime_ns, st.st_size)
    return out


class FileWatcher:
    """Polls ``root_dir`` on a daemon thread and calls ``callback`` once per
    change (added, edited or removed ``.html`` files). Stdlib only; reloads
    run on the watcher thread, one at a time, so the newest tree wins."""

    def __init__(self, root_dir: Union[str, Path], callback: Callable[[], None], interval: float = POLL_SECS) -> None:
        self.root = Path(root_dir)
        self.callback = callback
        self.interval = interval
        self._stop = threading.Event()
        self._last = snapshot(self.root)
        self._thread: Optional[threading.Thread] = threading.Thread(target=self._run, name="anza-watch", daemon=True)
        self._thread.start()

    def _run(self) -> None:
        while not self._stop.wait(self.interval):
            try:
                current = snapshot(self.root)
            except OSError:
                continue
            if current != self._last:
                self._last = current
                try:
                    self.callback()
                except Exception:
                    # A half-written or oversized file: keep the last good
                    # tree; the next change reloads it.
                    pass

    def close(self) -> None:
        self._stop.set()
        if self._thread is not None and self._thread is not threading.current_thread():
            self._thread.join(timeout=2)
        self._thread = None


def listen(root_dir: Union[str, Path], callback: Callable[[], None], interval: float = POLL_SECS) -> FileWatcher:
    """Start a polling watcher (see ``FileWatcher``)."""
    return FileWatcher(root_dir, callback, interval)

