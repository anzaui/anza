from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Manifest:
    templates: dict[str, str] = field(default_factory=dict)

    def insert(self, name: str, digest: str) -> None:
        self.templates[name] = digest

    def get(self, name: str) -> Optional[str]:
        return self.templates.get(name)
