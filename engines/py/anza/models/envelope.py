import json
from dataclasses import dataclass
from typing import Any, Optional

from ..crypto.envelope import ENVELOPE_VERSION, signature_message


@dataclass
class Envelope:
    """A rendered fragment on the wire (format v2, see ``docs/engines/contract.md``)."""

    slot: str
    ts: int
    html: str
    sig: Optional[str] = None
    css: Optional[str] = None
    #: Wire-format version, always 2 for envelopes this engine produces.
    v: int = ENVELOPE_VERSION

    def message(self) -> bytes:
        """The exact bytes the signature covers (v2, length-prefixed fields)."""
        return signature_message(self.ts, self.slot, self.html, self.css)

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "v": self.v,
            "slot": self.slot,
            "ts": self.ts,
            "html": self.html,
        }
        if self.sig is not None:
            data["sig"] = self.sig
        if self.css is not None:
            data["css"] = self.css
        return data

    def to_json(self) -> str:
        """Compact JSON, byte-identical to the Rust and TS engines."""
        return json.dumps(self.to_dict(), separators=(",", ":"), ensure_ascii=False)
