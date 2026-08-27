import hashlib
import secrets
from typing import Union, Tuple
from ..errors import AnzaError

# Try importing cryptography library for hardware-accelerated Ed25519
try:
    from cryptography.hazmat.primitives.asymmetric import ed25519 as _crypto_ed25519
    from cryptography.hazmat.primitives import serialization as _crypto_ser
    _HAS_CRYPTOGRAPHY = True
except ImportError:
    _HAS_CRYPTOGRAPHY = False

# ── RFC 8032 Pure Python Fallback Implementation ──────────────────────────
# Ed25519 constants
_P = 2**255 - 19
_D = -121665 * pow(121666, _P - 2, _P) % _P
_I = pow(2, (_P - 1) // 4, _P)
_Q = 2**252 + 27742317777372353535851937790883648493
_BY = 4 * pow(5, _P - 2, _P) % _P
_BX = 0


def _recover_x(y: int, sign: int) -> int:
    if y >= _P:
        raise ValueError("y coordinate out of range")
    x2 = (y * y - 1) * pow(_D * y * y + 1, _P - 2, _P) % _P
    if x2 == 0:
        if sign:
            raise ValueError("invalid x coordinate")
        return 0
    x = pow(x2, (_P + 3) // 8, _P)
    if (x * x - x2) % _P != 0:
        x = (x * _I) % _P
    if (x * x - x2) % _P != 0:
        raise ValueError("square root does not exist")
    if (x & 1) != sign:
        x = _P - x
    return x


_BX = _recover_x(_BY, 0)
_B = (_BX, _BY, 1, (_BX * _BY) % _P)


def _edwards_add(p: Tuple[int, int, int, int], q: Tuple[int, int, int, int]) -> Tuple[int, int, int, int]:
    x1, y1, z1, t1 = p
    x2, y2, z2, t2 = q
    a = (y1 - x1) * (y2 - x2) % _P
    b = (y1 + x1) * (y2 + x2) % _P
    c = 2 * t1 * t2 * _D % _P
    d = 2 * z1 * z2 % _P
    e = (b - a) % _P
    f = (d - c) % _P
    g = (d + c) % _P
    h = (b + a) % _P
    return (e * f % _P, g * h % _P, f * g % _P, e * h % _P)


def _scalarmult(p: Tuple[int, int, int, int], e: int) -> Tuple[int, int, int, int]:
    res = (0, 1, 1, 0)
    cur = p
    while e > 0:
        if e & 1:
            res = _edwards_add(res, cur)
        cur = _edwards_add(cur, cur)
        e >>= 1
    return res


def _encodepoint(p: Tuple[int, int, int, int]) -> bytes:
    x, y, z, _ = p
    zi = pow(z, _P - 2, _P)
    x = (x * zi) % _P
    y = (y * zi) % _P
    bits = [(y >> i) & 1 for i in range(255)] + [x & 1]
    return bytes(sum(bits[i * 8 + j] << j for j in range(8)) for i in range(32))


def _decodepoint(s: bytes) -> Tuple[int, int, int, int]:
    if len(s) != 32:
        raise ValueError("invalid point length")
    y = sum(s[i] << (i * 8) for i in range(32))
    sign = (y >> 255) & 1
    y &= (1 << 255) - 1
    x = _recover_x(y, sign)
    return (x, y, 1, (x * y) % _P)


def _clamp(s: bytes) -> int:
    a = bytearray(s[:32])
    a[0] &= 248
    a[31] &= 127
    a[31] |= 64
    return int.from_bytes(a, "little")


def _py_public_from_private(priv_bytes: bytes) -> bytes:
    h = hashlib.sha512(priv_bytes[:32]).digest()
    a = _clamp(h[:32])
    p = _scalarmult(_B, a)
    return _encodepoint(p)


def _py_sign(priv_bytes: bytes, msg: bytes) -> bytes:
    h = hashlib.sha512(priv_bytes[:32]).digest()
    a = _clamp(h[:32])
    pub = _encodepoint(_scalarmult(_B, a))
    r = int.from_bytes(hashlib.sha512(h[32:] + msg).digest(), "little") % _Q
    r_point = _scalarmult(_B, r)
    r_bytes = _encodepoint(r_point)
    k = int.from_bytes(hashlib.sha512(r_bytes + pub + msg).digest(), "little") % _Q
    s = (r + k * a) % _Q
    return r_bytes + s.to_bytes(32, "little")


def _py_verify(pub_bytes: bytes, msg: bytes, sig_bytes: bytes) -> bool:
    if len(sig_bytes) != 64 or len(pub_bytes) != 32:
        return False
    try:
        a_point = _decodepoint(pub_bytes)
        r_bytes = sig_bytes[:32]
        r_point = _decodepoint(r_bytes)
        s = int.from_bytes(sig_bytes[32:], "little")
        if s >= _Q:
            return False
        k = int.from_bytes(hashlib.sha512(r_bytes + pub_bytes + msg).digest(), "little") % _Q
        sb = _scalarmult(_B, s)
        ka = _scalarmult(a_point, k)
        expected = _edwards_add(r_point, ka)
        return _encodepoint(sb) == _encodepoint(expected)
    except Exception:
        return False


def keypair() -> Tuple[bytes, bytes]:
    """Generates an Ed25519 (private_key, public_key) pair."""
    if _HAS_CRYPTOGRAPHY:
        priv = _crypto_ed25519.Ed25519PrivateKey.generate()
        priv_bytes = priv.private_bytes(
            encoding=_crypto_ser.Encoding.Raw,
            format=_crypto_ser.PrivateFormat.Raw,
            encryption_algorithm=_crypto_ser.NoEncryption(),
        )
        pub_bytes = priv.public_key().public_bytes(
            encoding=_crypto_ser.Encoding.Raw,
            format=_crypto_ser.PublicFormat.Raw,
        )
        return priv_bytes, pub_bytes

    priv_bytes = secrets.token_bytes(32)
    pub_bytes = _py_public_from_private(priv_bytes)
    return priv_bytes, pub_bytes


def _normalize_key(key: Union[str, bytes]) -> bytes:
    if isinstance(key, str):
        if len(key) == 64:
            try:
                return bytes.fromhex(key)
            except ValueError:
                pass
        return key.encode("utf-8")
    return key


def sign(private_key: Union[str, bytes], data: Union[str, bytes]) -> str:
    data_bytes = data.encode("utf-8") if isinstance(data, str) else data
    key_bytes = _normalize_key(private_key)

    if _HAS_CRYPTOGRAPHY and len(key_bytes) == 32:
        try:
            priv = _crypto_ed25519.Ed25519PrivateKey.from_private_bytes(key_bytes)
            signature = priv.sign(data_bytes)
            return signature.hex()
        except Exception:
            pass

    return _py_sign(key_bytes, data_bytes).hex()


def verify(public_key: Union[str, bytes], data: Union[str, bytes], signature_hex: str) -> bool:
    try:
        data_bytes = data.encode("utf-8") if isinstance(data, str) else data
        key_bytes = _normalize_key(public_key)
        sig_bytes = bytes.fromhex(signature_hex)

        if _HAS_CRYPTOGRAPHY and len(key_bytes) == 32:
            try:
                pub = _crypto_ed25519.Ed25519PublicKey.from_public_bytes(key_bytes)
                pub.verify(sig_bytes, data_bytes)
                return True
            except Exception:
                return False

        return _py_verify(key_bytes, data_bytes, sig_bytes)
    except Exception:
        return False
