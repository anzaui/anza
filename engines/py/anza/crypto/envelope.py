"""Envelope signatures, wire format v2 (see ``docs/engines/contract.md``).

::

    message  = "anza-sig-v2\\n" field(ts) field(slot) field(html) field(css)
    field(x) = <decimal UTF-8 byte length of x> ":" x "\\n"

``ts`` is written in decimal; an absent ``css`` is the empty string.
"""

import time
from dataclasses import dataclass
from typing import Any, Callable, Mapping, Optional, Union

from ..errors import AnzaError
from . import ed25519 as _ed25519
from . import hmac as _hmac
from .hex import decode
from .signer import HMAC_MIN_SECRET, public_key as _public_key

#: Envelope wire-format version produced and accepted by this engine.
ENVELOPE_VERSION = 2

#: Domain-separation prefix of every v2 signature message.
SIGNATURE_DOMAIN = b"anza-sig-v2\n"

#: Default tolerance for a timestamp ahead of the verifier's clock.
DEFAULT_SKEW_SECS = 5


def _field(value: str) -> bytes:
    raw = value.encode("utf-8")
    return b"%d:%s\n" % (len(raw), raw)


def signature_message(ts: int, slot: str, html: str, css: Optional[str] = None) -> bytes:
    """The exact bytes a v2 signature covers."""
    return SIGNATURE_DOMAIN + _field(str(ts)) + _field(slot) + _field(html) + _field(css or "")


@dataclass(frozen=True)
class VerifyKey:
    """The key that checks an envelope signature."""

    mode: str
    secret: Union[str, bytes, None] = None
    public_key: Any = None

    @classmethod
    def hmac(cls, secret: Union[str, bytes]) -> "VerifyKey":
        return cls(mode="hmac", secret=secret)

    @classmethod
    def ed25519(cls, public_key: Any) -> "VerifyKey":
        return cls(mode="ed25519", public_key=public_key)

    def __repr__(self) -> str:
        return f"VerifyKey(mode={self.mode!r}, key=<redacted>)"


def _get(envelope: Any, name: str) -> Any:
    if isinstance(envelope, Mapping):
        return envelope.get(name)
    return getattr(envelope, name, None)


def _verify_with(
    envelope: Any,
    check_sig: Callable[[bytes, str], bool],
    max_age_secs: int,
    slot: str,
    skew_secs: int,
    now: Optional[int],
) -> None:
    v = _get(envelope, "v")
    if isinstance(v, bool) or v != ENVELOPE_VERSION:
        raise AnzaError.crypto("unsupported envelope version")
    ts, env_slot, html, css, sig = (_get(envelope, k) for k in ("ts", "slot", "html", "css", "sig"))
    if (
        not isinstance(ts, int)
        or isinstance(ts, bool)
        or ts < 0
        or not isinstance(env_slot, str)
        or not isinstance(html, str)
        or (css is not None and not isinstance(css, str))
    ):
        raise AnzaError.crypto("malformed envelope")
    if sig is None:
        raise AnzaError.crypto("envelope is not signed")
    if not isinstance(sig, str) or decode(sig) is None:
        raise AnzaError.crypto("malformed signature")
    current = int(time.time()) if now is None else now
    if ts > current + skew_secs:
        raise AnzaError.crypto("envelope timestamp is in the future")
    if current - ts > max_age_secs:
        raise AnzaError.crypto("envelope expired")
    if env_slot != slot:
        raise AnzaError.crypto("slot mismatch")
    if not check_sig(signature_message(ts, env_slot, html, css), sig):
        raise AnzaError.crypto("bad signature")


def verify_envelope(
    key: VerifyKey,
    envelope: Any,
    *,
    max_age_secs: int,
    slot: str,
    skew_secs: int = DEFAULT_SKEW_SECS,
    now: Optional[int] = None,
) -> None:
    """Verify a received envelope (an ``Envelope`` or a parsed JSON dict):
    version, signature format, freshness (``max_age_secs``, plus ``skew_secs``
    into the future), the expected ``slot``, then the signature
    (constant-time). Raises ``AnzaError`` with code ``CRYPTO`` whose message
    names the failed check; returns ``None`` when valid."""
    if key.mode == "hmac":
        secret = key.secret.encode("utf-8") if isinstance(key.secret, str) else key.secret
        if not isinstance(secret, (bytes, bytearray)) or len(secret) < HMAC_MIN_SECRET:
            raise AnzaError.crypto("invalid verification key")
        check = lambda msg, sig: _hmac.verify(bytes(secret), msg, sig)  # noqa: E731
    elif key.mode == "ed25519":
        try:
            pub = _public_key(key.public_key)
        except AnzaError:
            raise AnzaError.crypto("invalid verification key") from None
        check = lambda msg, sig: _ed25519.verify(pub, msg, sig)  # noqa: E731
    else:
        raise AnzaError.crypto("invalid verification key")
    _verify_with(envelope, check, max_age_secs, slot, skew_secs, now)
