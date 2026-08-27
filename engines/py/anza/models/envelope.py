from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class Envelope:
    slot: str
    ts: int
    html: str
    sig: Optional[str] = None
    css: Optional[str] = None

    def message(self) -> str:
        return f"{self.ts}:{self.slot}:{self.html}"

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "slot": self.slot,
            "ts": self.ts,
            "html": self.html,
        }
        if self.sig is not None:
            data["sig"] = self.sig
        if self.css is not None:
            data["css"] = self.css
        return data
