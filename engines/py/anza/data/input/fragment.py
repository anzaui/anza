from dataclasses import dataclass
from typing import Any, Optional
from ...engine.cache.engine import Engine
from ...errors import AnzaError
from ...models.envelope import Envelope
from ...render.fragment import render_fragment


@dataclass
class Fragment:
    template: str
    slot: str
    params: Any = None

    def validate(self) -> None:
        if not self.template:
            raise AnzaError.validation("Fragment template path must not be empty")
        if not self.slot:
            raise AnzaError.validation("Fragment target slot must not be empty")

    def run(self, engine: Engine) -> Envelope:
        self.validate()
        return render_fragment(engine, self.template, self.slot, self.params)
