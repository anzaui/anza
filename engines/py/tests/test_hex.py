"""Signatures use strict lowercase hex: malformed input is rejected and there
is exactly one accepted spelling (G3, G8)."""

import unittest

from anza.crypto import ed25519, hex as anza_hex, hmac

SECRET = b"0123456789abcdef0123456789abcdef"
SEED = bytes([7]) * 32


def public_of(seed: bytes) -> bytes:
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

    key = Ed25519PrivateKey.from_private_bytes(seed)
    return key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)


class TestHex(unittest.TestCase):
    def test_strict_decode(self):
        self.assertEqual(anza_hex.encode(bytes([0, 0xAB, 0xFF])), "00abff")
        self.assertEqual(anza_hex.decode("00abff"), bytes([0, 0xAB, 0xFF]))
        for bad in ["ABFF", "abf", "zz", "€a", "a€", "+1", " 0", "0 ", "ab\n"]:
            self.assertIsNone(anza_hex.decode(bad), bad)
        self.assertEqual(anza_hex.decode_length("abff", 2), bytes([0xAB, 0xFF]))
        self.assertIsNone(anza_hex.decode_length("abffab", 2))

    def test_non_ascii_signatures_are_rejected(self):
        for sig in ["€a", "€" * 32, "ü" * 64]:
            self.assertFalse(hmac.verify(SECRET, "m", sig))
            self.assertFalse(ed25519.verify(public_of(SEED), "m", sig))

    def test_trailing_garbage_is_rejected(self):
        sig = hmac.sign(SECRET, "m")
        self.assertTrue(hmac.verify(SECRET, "m", sig))
        self.assertFalse(hmac.verify(SECRET, "m", sig + "zz"))
        self.assertFalse(hmac.verify(SECRET, "m", sig + "00"))
        self.assertFalse(hmac.verify(SECRET, "m", sig[:62]))

        ed_sig = ed25519.sign(SEED, "m")
        self.assertTrue(ed25519.verify(public_of(SEED), "m", ed_sig))
        self.assertFalse(ed25519.verify(public_of(SEED), "m", ed_sig + "zz"))
        self.assertFalse(ed25519.verify(public_of(SEED), "m", ed_sig + "00"))

    def test_uppercase_is_rejected(self):
        sig = hmac.sign(SECRET, "m")
        self.assertEqual(sig, sig.lower())
        self.assertFalse(hmac.verify(SECRET, "m", sig.upper()))
        ed_sig = ed25519.sign(SEED, "m")
        self.assertFalse(ed25519.verify(public_of(SEED), "m", ed_sig.upper()))


if __name__ == "__main__":
    unittest.main()
