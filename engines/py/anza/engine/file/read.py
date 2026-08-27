from pathlib import Path
from typing import Union
from ...errors import AnzaError


def text(file_path: Union[str, Path]) -> str:
    path = Path(file_path)
    try:
        return path.read_text(encoding="utf-8")
    except Exception as e:
        raise AnzaError.not_found(f"Failed to read template at {path}: {e}")
