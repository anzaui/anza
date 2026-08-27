from dataclasses import dataclass
from typing import Any, Optional
from ...engine.cache.engine import Engine
from ...errors import AnzaError
from ...models.document import Document
from ...render.page import render_page


@dataclass
class Page:
    route: str
    params: Any = None

    def validate(self) -> None:
        if not self.route:
            raise AnzaError.validation("Page route must not be empty")

    def run(self, engine: Engine) -> Document:
        self.validate()
        return render_page(engine, self.route, self.params)
