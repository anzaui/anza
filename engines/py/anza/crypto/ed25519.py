"""Ed25519 signing and verification, backed by ``cryptography`` (constant-time,
RFC 8032). Keys are exactly 32 bytes (or 64-char lowercase hex), or
``cryptography`` key objects; anything else is rejected."""

from typing import Any, Tuple, Union

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat

from ..errors import AnzaError
from .hex import decode_length
from .signer import private_key, public_key, raw_public_key


def keypair() -> Tuple[bytes, bytes]:
    """Generate an Ed25519 ``(private_seed, public_key)`` pair, 32 bytes each."""
    key = Ed25519PrivateKey.generate()
    seed = key.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
    return seed, raw_public_key(key)


def sign(key: Any, data: Union[str, bytes]) -> str:
    """Sign ``data``; returns a lowercase-hex signature. Raises ``CRYPTO`` for
    a malformed key."""
    data_bytes = data.encode("utf-8") if isinstance(data, str) else bytes(data)
    try:
        return private_key(key).sign(data_bytes).hex()
    except AnzaError:
        raise
    except Exception as e:  # pragma: no cover - defensive
        raise AnzaError.crypto(f"Ed25519 signing failed: {type(e).__name__}") from None


def verify(key: Any, data: Union[str, bytes], signature_hex: str) -> bool:
    """Verify a lowercase-hex Ed25519 signature. Malformed keys or signatures
    (wrong length, non-hex, uppercase) return ``False``."""
    sig = decode_length(signature_hex, 64)
    if sig is None:
        return False
    try:
        pub = public_key(key)
    except AnzaError:
        return False
    data_bytes = data.encode("utf-8") if isinstance(data, str) else bytes(data)
    try:
        pub.verify(sig, data_bytes)
        return True
    except InvalidSignature:
        return False
