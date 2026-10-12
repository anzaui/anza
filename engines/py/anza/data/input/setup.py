from dataclasses import dataclass, field
from pathlib import Path
from typing import Union
from ...engine.cache.engine import Engine, SignOptions
from ...engine.cache.store import CacheStore
from ...engine.file.load import DEFAULT_MAX_TEMPLATE_BYTES, all as load_all
from ...engine.file.watch import listen
from ...crypto.signer import Signer
from ...errors import AnzaError


@dataclass
class Setup:
    root: Union[str, Path]
    signing: SignOptions = field(default_factory=SignOptions)
    #: Reload templates when files under ``root`` change (a polling thread;
    #: stop it with ``Engine.close()``).
    watch: bool = False
    #: Fragment allowlist. Empty (the default) lets fragments use any
    #: template; otherwise an entry ending in ``/`` allows that prefix (e.g.
    #: ``"fragments/"``) and any other entry allows that exact name.
    fragments: list[str] = field(default_factory=list)
    #: HTML-escape ``{{slot}}`` values; ``{{{slot}}}`` stays raw. Off by
    #: default (values are inserted as-is), see ``docs/engines/contract.md``.
    escape: bool = False
    #: Refuse template files larger than this (default 1 MiB).
    max_template_bytes: int = DEFAULT_MAX_TEMPLATE_BYTES

    def validate(self) -> None:
        p = Path(self.root)
        if not p.exists():
            raise AnzaError.validation(f"Templates root directory '{self.root}' does not exist")
        if not p.is_dir():
            raise AnzaError.validation(f"Templates root path '{self.root}' is not a directory")

    def run(self) -> Engine:
        """Validate the root and the signing keys, load every template, and
        start the watcher when ``watch`` is set."""
        self.validate()
        signer = Signer.from_options(self.signing)

        def load() -> dict:
            return load_all(self.root, escape=self.escape, max_bytes=self.max_template_bytes)

        cache = CacheStore(load())
        engine = Engine(self.root, cache, signer, fragments=self.fragments)
        if self.watch:

            def reload() -> None:
                # Swap the whole dict: readers see the old or the new tree.
                cache.templates = load()

            engine.watcher = listen(self.root, reload)
        return engine
