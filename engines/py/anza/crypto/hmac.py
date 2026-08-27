import hmac
import hashlib
from typing import Union


def sign(secret: Union[str, bytes], data: Union[str, bytes]) -> str:
    secret_bytes = secret.encode("utf-8") if isinstance(secret, str) else secret
    data_bytes = data.encode("utf-8") if isinstance(data, str) else data
    return hmac.new(secret_bytes, data_bytes, hashlib.sha256).hexdigest()


def verify(secret: Union[str, bytes], data: Union[str, bytes], signature_hex: str) -> bool:
    try:
        expected = sign(secret, data)
        return hmac.compare_digest(expected, signature_hex)
    except Exception:
        return False
