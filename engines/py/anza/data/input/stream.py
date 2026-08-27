from dataclasses import dataclass
from typing import Any, Optional
from ...engine.cache.engine import Engine
from ...errors import AnzaError
from ...render.fragment import render_fragment
from ...stream.sse import format_event


@dataclass
class Stream:
    template: str
    slot: str
    params: Any = None

    def validate(self) -> None:
        if not self.template:
            raise AnzaError.validation("Stream template path must not be empty")
        if not self.slot:
            raise AnzaError.validation("Stream target slot must not be empty")

    def run(self, engine: Engine) -> str:
        self.validate()
        env = render_fragment(engine, self.template, self.slot, self.params)
        return format_event(env)
