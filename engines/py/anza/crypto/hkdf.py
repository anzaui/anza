import hashlib
from typing import Union, Optional
from ..errors import AnzaError


def derive_key(
    ikm: Union[str, bytes],
    salt: Optional[Union[str, bytes]] = None,
    info: Union[str, bytes] = "anza-stui-session-v1",
    keylen: int = 32,
) -> bytes:
    try:
        ikm_bytes = ikm.encode("utf-8") if isinstance(ikm, str) else ikm
        salt_bytes = (salt.encode("utf-8") if isinstance(salt, str) else salt) if salt else b""
        info_bytes = info.encode("utf-8") if isinstance(info, str) else info

        # Python 3.8+ native hashlib.hkdf
        if hasattr(hashlib, "hkdf"):
            return hashlib.hkdf(
                "sha256",
                ikm=ikm_bytes,
                salt=salt_bytes,
                info=info_bytes,
                length=keylen,
            )
        
        # Fallback manual RFC 5869 extract and expand using hmac
        import hmac
        if not salt_bytes:
            salt_bytes = b"\x00" * 32
        prk = hmac.new(salt_bytes, ikm_bytes, hashlib.sha256).digest()
        t = b""
        okm = b""
        i = 1
        while len(okm) < keylen:
            t = hmac.new(prk, t + info_bytes + bytes([i]), hashlib.sha256).digest()
            okm += t
            i += 1
        return okm[:keylen]
    except Exception as e:
        raise AnzaError.crypto(f"HKDF key derivation failed: {e}")
