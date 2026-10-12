import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal, Optional, Union
from ...crypto.envelope import DEFAULT_SKEW_SECS, _verify_with
from ...crypto.signer import Signer
from ...errors import AnzaError
from ...models.document import Document
from ...models.envelope import Envelope
from ..file.load import Template, one
from .store import CacheStore

SignMode = Literal["none", "hmac", "ed25519"]


@dataclass
class SignOptions:
    """How fragments are signed. Keys are validated by ``Setup.run``.

    - ``hmac``: ``secret`` (str or bytes) of at least 32 bytes.
    - ``ed25519``: ``private_key`` as a 32-byte seed, 64-char lowercase hex,
      or an ``Ed25519PrivateKey``; optional ``public_key`` must match it.
    """

    mode: SignMode = "none"
    secret: Optional[Union[str, bytes]] = None
    private_key: Any = None
    public_key: Any = None

    def __repr__(self) -> str:
        parts = [f"mode={self.mode!r}"]
        if self.secret is not None:
            parts.append("secret=<redacted>")
        if self.private_key is not None:
            parts.append("private_key=<redacted>")
        if self.public_key is not None:
            parts.append("public_key=<set>")
        return f"SignOptions({', '.join(parts)})"


class Engine:
    def __init__(
        self,
        root: Union[str, Path],
        cache: CacheStore,
        signing: Union[SignOptions, Signer, None] = None,
    ) -> None:
        self.root = Path(root)
        self.cache = cache
        #: The validated signing key (``repr`` is redacted).
        self.signer = signing if isinstance(signing, Signer) else Signer.from_options(signing or SignOptions())

    def __repr__(self) -> str:
        return f"Engine(root={str(self.root)!r}, templates={len(self.cache.templates)}, signer={self.signer!r})"

    def get_template(self, name: str) -> Template:
        normalized = name.replace("\\", "/").lstrip("/")
        tpl = self.cache.get(normalized)
        if tpl:
            return tpl

        # Fallback load on-demand. Names can come from request paths (pages/<route>),
        # so refuse anything that resolves outside the template root.
        root = self.root.resolve()
        if not (root / normalized).resolve().is_relative_to(root):
            raise AnzaError.not_found(f"Template '{normalized}' is outside '{self.root}'")
        try:
            tpl = one(self.root, normalized)
            self.cache.insert(normalized, tpl)
            return tpl
        except Exception as e:
            raise AnzaError.not_found(f"Template '{normalized}' not found in '{self.root}': {e}")

    def verify_envelope(
        self,
        envelope: Any,
        *,
        max_age_secs: int,
        slot: str,
        skew_secs: int = DEFAULT_SKEW_SECS,
        now: Optional[int] = None,
    ) -> None:
        """Verify an envelope against this engine's own key (HMAC secret or
        the Ed25519 public key). Same checks as ``verify_envelope``; raises
        ``CRYPTO``."""
        if self.signer.mode == "none":
            raise AnzaError.crypto("signing is off")
        _verify_with(envelope, self.signer.verify, max_age_secs, slot, skew_secs, now)

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
