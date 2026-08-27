from typing import Optional
from ..file.load import Template
from ...models.manifest import Manifest


class CacheStore:
    def __init__(self, templates: Optional[dict[str, Template]] = None) -> None:
        self.templates: dict[str, Template] = templates or {}

    def get(self, name: str) -> Optional[Template]:
        normalized = name.replace("\\", "/").lstrip("/")
        return self.templates.get(normalized)

    def insert(self, name: str, template: Template) -> None:
        normalized = name.replace("\\", "/").lstrip("/")
        self.templates[normalized] = template

    def has(self, name: str) -> bool:
        normalized = name.replace("\\", "/").lstrip("/")
        return normalized in self.templates

    def keys(self) -> list[str]:
        return list(self.templates.keys())

    def manifest(self) -> Manifest:
        m = Manifest()
        for name, tpl in self.templates.items():
            m.insert(name, tpl.digest)
        return m
