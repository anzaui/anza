"""Strict lowercase hex, the only encoding used for signatures and digests on
the wire. ``decode`` rejects uppercase digits, odd lengths, whitespace and any
other character, so a signature has exactly one accepted spelling
(``bytes.fromhex`` accepts uppercase and whitespace)."""

import re
from typing import Optional

_STRICT = re.compile(r"(?:[0-9a-f]{2})*")


def encode(data: bytes) -> str:
    """Lowercase hex of ``data``."""
    return bytes(data).hex()


def decode(text: str) -> Optional[bytes]:
    """Decode lowercase, even-length hex. ``None`` for anything else."""
    if not isinstance(text, str) or _STRICT.fullmatch(text) is None:
        return None
    return bytes.fromhex(text)


def decode_length(text: str, length: int) -> Optional[bytes]:
    """Decode exactly ``length`` bytes of lowercase hex. ``None`` otherwise."""
    if not isinstance(text, str) or len(text) != length * 2:
        return None
    return decode(text)
