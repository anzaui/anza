from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Union
from ...engine.cache.engine import Engine, SignOptions
from ...engine.cache.store import CacheStore
from ...engine.file.load import all as load_all
from ...crypto.signer import Signer
from ...errors import AnzaError


@dataclass
class Setup:
    root: Union[str, Path]
    signing: SignOptions = field(default_factory=SignOptions)
    watch: bool = False
    #: Fragment allowlist. Empty (the default) lets fragments use any
    #: template; otherwise an entry ending in ``/`` allows that prefix (e.g.
    #: ``"fragments/"``) and any other entry allows that exact name.
    fragments: list[str] = field(default_factory=list)
    #: HTML-escape ``{{slot}}`` values; ``{{{slot}}}`` stays raw. Off by
    #: default (values are inserted as-is), see ``docs/engines/contract.md``.
    escape: bool = False

    def validate(self) -> None:
        p = Path(self.root)
        if not p.exists():
            raise AnzaError.validation(f"Templates root directory '{self.root}' does not exist")
        if not p.is_dir():
            raise AnzaError.validation(f"Templates root path '{self.root}' is not a directory")

    def run(self) -> Engine:
        """Validate the root and the signing keys, then load every template."""
        self.validate()
        signer = Signer.from_options(self.signing)
        templates = load_all(self.root, escape=self.escape)
        cache = CacheStore(templates)
        return Engine(self.root, cache, signer, fragments=self.fragments)
