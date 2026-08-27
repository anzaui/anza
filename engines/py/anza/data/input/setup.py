from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Union
from ...engine.cache.engine import Engine, SignOptions
from ...engine.cache.store import CacheStore
from ...engine.file.load import all as load_all
from ...errors import AnzaError


@dataclass
class Setup:
    root: Union[str, Path]
    signing: SignOptions = field(default_factory=SignOptions)
    watch: bool = False

    def validate(self) -> None:
        p = Path(self.root)
        if not p.exists():
            raise AnzaError.validation(f"Templates root directory '{self.root}' does not exist")
        if not p.is_dir():
            raise AnzaError.validation(f"Templates root path '{self.root}' is not a directory")

    def run(self) -> Engine:
        self.validate()
        templates = load_all(self.root)
        cache = CacheStore(templates)
        return Engine(self.root, cache, self.signing)
