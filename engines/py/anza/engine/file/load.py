from dataclasses import dataclass
from pathlib import Path
from typing import Any, Union
from ...crypto import digest
from ..slot import Chunk, extract, string
from .read import text


@dataclass
class Template:
    name: str
    path: Path
    raw: str
    digest: str
    chunks: list[Chunk]

    def bind(self, params: Any = None) -> str:
        return string(self.chunks, params)

    def render(self, params: Any = None) -> str:
        return string(self.chunks, params)


def one(root_dir: Union[str, Path], rel_path: Union[str, Path]) -> Template:
    root = Path(root_dir)
    full_path = root / rel_path
    raw = text(full_path)
    hash_hex = digest.hex(raw)
    chunks = extract(raw)
    normalized_name = str(Path(rel_path)).replace("\\", "/").lstrip("/")

    return Template(
        name=normalized_name,
        path=full_path,
        raw=raw,
        digest=hash_hex,
        chunks=chunks,
    )


def all(root_dir: Union[str, Path]) -> dict[str, Template]:
    root = Path(root_dir)
    templates: dict[str, Template] = {}

    if not root.exists():
        return templates

    for file_path in root.rglob("*.html"):
        if file_path.is_file():
            rel_path = file_path.relative_to(root)
            tpl = one(root, rel_path)
            templates[tpl.name] = tpl

    return templates
