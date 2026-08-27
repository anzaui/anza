import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal, Optional, Union
from ...crypto import hmac as anza_hmac, ed25519 as anza_ed25519
from ...errors import AnzaError
from ...models.document import Document
from ...models.envelope import Envelope
from ..file.load import Template, one
from .store import CacheStore

SignMode = Literal["none", "hmac", "ed25519", "session"]


@dataclass
class SignOptions:
    mode: SignMode = "none"
    secret: Optional[str] = None
    private_key: Optional[str] = None
    public_key: Optional[str] = None


class Engine:
    def __init__(
        self,
        root: Union[str, Path],
        cache: CacheStore,
        signing: Optional[SignOptions] = None,
    ) -> None:
        self.root = Path(root)
        self.cache = cache
        self.signing = signing or SignOptions()

    def get_template(self, name: str) -> Template:
        normalized = name.replace("\\", "/").lstrip("/")
        tpl = self.cache.get(normalized)
        if tpl:
            return tpl

        # Fallback load on-demand
        try:
            tpl = one(self.root, normalized)
            self.cache.insert(normalized, tpl)
            return tpl
        except Exception as e:
            raise AnzaError.not_found(f"Template '{normalized}' not found in '{self.root}': {e}")

    def render_page(self, route: str, params: Any = None) -> Document:
        from ...render.page import render_page
        return render_page(self, route, params)

    def render_fragment(
        self,
        template_name: str,
        slot: str,
        params: Any = None,
    ) -> Envelope:
        from ...render.fragment import render_fragment
        return render_fragment(self, template_name, slot, params)
