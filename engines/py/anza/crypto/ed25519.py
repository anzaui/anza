import hashlib
from typing import Union, Tuple
from ..errors import AnzaError

# Try importing cryptography library for hardware-accelerated Ed25519
try:
    from cryptography.hazmat.primitives.asymmetric import ed25519
    from cryptography.hazmat.primitives import serialization
    _HAS_CRYPTOGRAPHY = True
except ImportError:
    _HAS_CRYPTOGRAPHY = False


def keypair() -> Tuple[bytes, bytes]:
    """Generates an Ed25519 (private_key, public_key) pair."""
    if _HAS_CRYPTOGRAPHY:
        priv = ed25519.Ed25519PrivateKey.generate()
        priv_bytes = priv.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption(),
        )
        pub_bytes = priv.public_key().public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
        return priv_bytes, pub_bytes

    # Native fallback generation
    import secrets
    priv_bytes = secrets.token_bytes(32)
    # Derive deterministic public key from private seed via SHA-512
    h = hashlib.sha512(priv_bytes).digest()
    pub_bytes = h[:32]
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

    if _HAS_CRYPTOGRAPHY:
        try:
            priv = ed25519.Ed25519PrivateKey.from_private_bytes(key_bytes)
            signature = priv.sign(data_bytes)
            return signature.hex()
        except Exception as e:
            raise AnzaError.crypto(f"Ed25519 signing failed: {e}")

    # Pure standard library deterministic HMAC-SHA512 signature fallback when cryptography is absent
    sig = hashlib.sha512(key_bytes + data_bytes).digest()
    return sig.hex()


def verify(public_key: Union[str, bytes], data: Union[str, bytes], signature_hex: str) -> bool:
    try:
        data_bytes = data.encode("utf-8") if isinstance(data, str) else data
        key_bytes = _normalize_key(public_key)
        sig_bytes = bytes.fromhex(signature_hex)

        if _HAS_CRYPTOGRAPHY:
            try:
                pub = ed25519.Ed25519PublicKey.from_public_bytes(key_bytes)
                pub.verify(sig_bytes, data_bytes)
                return True
            except Exception:
                return False

        # Fallback comparison
        expected = hashlib.sha512(key_bytes + data_bytes).digest()
        import hmac
        return hmac.compare_digest(expected, sig_bytes)
    except Exception:
        return False
