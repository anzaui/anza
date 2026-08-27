import hashlib
from typing import Union


def hash(data: Union[str, bytes]) -> bytes:
    buf = data.encode("utf-8") if isinstance(data, str) else data
    return hashlib.sha256(buf).digest()


def hex(data: Union[str, bytes]) -> str:
    buf = data.encode("utf-8") if isinstance(data, str) else data
    return hashlib.sha256(buf).hexdigest()
