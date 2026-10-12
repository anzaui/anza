from typing import Optional
from ..file.load import Template
from ...models.manifest import Manifest


class CacheStore:
    """Templates by name. Lookups are exact: names are never rewritten, so
    aliases of one file (``a/./b.html``, ``\\a\\b.html``) cannot grow the cache."""

    def __init__(self, templates: Optional[dict[str, Template]] = None) -> None:
        self.templates: dict[str, Template] = templates or {}

    def get(self, name: str) -> Optional[Template]:
        return self.templates.get(name)

    def insert(self, name: str, template: Template) -> None:
        self.templates[name] = template

    def remove(self, name: str) -> None:
        self.templates.pop(name, None)

    def has(self, name: str) -> bool:
        return name in self.templates

    def keys(self) -> list[str]:
        return list(self.templates.keys())

    def manifest(self) -> Manifest:
        m = Manifest()
        for name, tpl in self.templates.items():
            m.insert(name, tpl.digest)
        return m
