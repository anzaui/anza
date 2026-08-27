from pathlib import Path
from typing import Callable, Union


def listen(root_dir: Union[str, Path], callback: Callable[[str], None]) -> None:
    """Lightweight file watcher hook for development hot reload."""
    pass
