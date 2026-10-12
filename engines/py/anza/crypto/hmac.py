import hmac
import hashlib
from typing import Union
from .hex import decode_length


def sign(secret: Union[str, bytes], data: Union[str, bytes]) -> str:
    secret_bytes = secret.encode("utf-8") if isinstance(secret, str) else secret
    data_bytes = data.encode("utf-8") if isinstance(data, str) else data
    return hmac.new(secret_bytes, data_bytes, hashlib.sha256).hexdigest()


def verify(secret: Union[str, bytes], data: Union[str, bytes], signature_hex: str) -> bool:
    """Verify a lowercase-hex HMAC-SHA256 signature in constant time.
    Malformed signatures (wrong length, non-hex, uppercase) return ``False``."""
    actual = decode_length(signature_hex, 32)
    if actual is None:
        return False
    try:
        secret_bytes = secret.encode("utf-8") if isinstance(secret, str) else secret
        data_bytes = data.encode("utf-8") if isinstance(data, str) else data
        expected = hmac.new(secret_bytes, data_bytes, hashlib.sha256).digest()
        return hmac.compare_digest(expected, actual)
    except Exception:
        return False
