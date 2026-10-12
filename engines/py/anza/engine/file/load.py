import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Union

from ...crypto import digest
from ...errors import AnzaError
from ..slot import Chunk, extract
from ..slot.bind import Renderer

#: Default cap on a template file's size: 1 MiB.
DEFAULT_MAX_TEMPLATE_BYTES = 1024 * 1024


@dataclass
class Template:
    name: str
    path: Path
    raw: str
    digest: str
    chunks: list[Chunk]
    #: HTML-escape ``{{slot}}`` values (``Setup.escape``).
    escape: bool = False
    renderer: Renderer = field(init=False, repr=False, compare=False)

    def __post_init__(self) -> None:
        self.renderer = Renderer(self.chunks, self.escape)

    def bind(self, params: Any = None) -> str:
        return self.renderer(params)

    def render(self, params: Any = None) -> str:
        return self.renderer(params)


def _inside(root: Path, path: Path) -> bool:
    try:
        return path.resolve(strict=True).is_relative_to(root.resolve(strict=True))
    except (OSError, RuntimeError):
        return False


def one(
    root_dir: Union[str, Path],
    rel_path: Union[str, Path],
    escape: bool = False,
    max_bytes: int = DEFAULT_MAX_TEMPLATE_BYTES,
) -> Template:
    """Load one template. Errors name the template, never the full path: a
    file that resolves (through a symlink) outside ``root_dir``, or that is
    larger than ``max_bytes``, is refused."""
    root = Path(root_dir)
    name = Path(rel_path).as_posix().lstrip("/")
    full_path = root / rel_path
    if not _inside(root, full_path):
        raise AnzaError.not_found(f"Template '{name}' is outside the template root")
    try:
        with open(full_path, "rb") as f:
            data = f.read(max_bytes + 1)
    except OSError as e:
        raise AnzaError.not_found(f"Failed to read template '{name}': {type(e).__name__}") from None
    if len(data) > max_bytes:
        raise AnzaError.template(f"Template '{name}' is larger than {max_bytes} bytes")
    try:
        raw = data.decode("utf-8")
    except UnicodeDecodeError:
        raise AnzaError.template(f"Template '{name}' is not valid UTF-8") from None

    return Template(
        name=name,
        path=full_path,
        raw=raw,
        digest=digest.hex(raw),
        chunks=extract(raw),
        escape=escape,
    )


def files(root_dir: Union[str, Path]) -> list[Path]:
    """Every ``.html`` file under ``root_dir``, relative to it. Symlinked
    directories are not followed; symlinked files that resolve outside the
    root are skipped."""
    root = Path(root_dir)
    out: list[Path] = []
    for current, _dirs, names in os.walk(root, followlinks=False):
        for fname in names:
            if not fname.endswith(".html"):
                continue
            path = Path(current) / fname
            if path.is_symlink() and not _inside(root, path):
                continue
            if path.is_file():
                out.append(path.relative_to(root))
    return out


def all(
    root_dir: Union[str, Path],
    escape: bool = False,
    max_bytes: int = DEFAULT_MAX_TEMPLATE_BYTES,
) -> dict[str, Template]:
    """Load every ``.html`` file under ``root_dir`` (see ``files``)."""
    root = Path(root_dir)
    templates: dict[str, Template] = {}
    if not root.exists():
        return templates
    for rel_path in files(root):
        tpl = one(root, rel_path, escape=escape, max_bytes=max_bytes)
        templates[tpl.name] = tpl
    return templates
