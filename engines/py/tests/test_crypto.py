import unittest
from anza import AnzaError, Setup, Fragment, SignOptions
from anza.crypto import hmac, ed25519, hkdf, digest
import tempfile
from pathlib import Path


class TestAnzaCrypto(unittest.TestCase):
    def test_digest(self):
        h = digest.hex("hello anza")
        self.assertEqual(len(h), 64)

    def test_hmac_signing_and_verification(self):
        secret = "secret-key-32-bytes-long-12345"
        data = "1724771200:feed:<div>Card Content</div>"

        sig = hmac.sign(secret, data)
        self.assertTrue(hmac.verify(secret, data, sig))
        # Tamper check
        self.assertFalse(hmac.verify(secret, data + "!", sig))
        self.assertFalse(hmac.verify("wrong-secret", data, sig))

    def test_ed25519_keypair_and_verification(self):
        priv, pub = ed25519.keypair()
        data = "1724771200:feed:<div>Ed25519 Fragment</div>"

        sig = ed25519.sign(priv, data)
        self.assertTrue(ed25519.verify(pub, data, sig))
        # Tamper check
        self.assertFalse(ed25519.verify(pub, data + "tampered", sig))

    def test_ed25519_rejects_non_32_byte_keys(self):
        # The removed pure-Python fallback signed with any key length (G1).
        for bad in (b"", b"short", b"\x07" * 31, b"\x07" * 33, b"\x07" * 64, "not-hex-at-all"):
            with self.assertRaises(AnzaError) as ctx:
                ed25519.sign(bad, "data")
            self.assertEqual(ctx.exception.code, "CRYPTO")
            self.assertFalse(ed25519.verify(bad, "data", "00" * 64))

    def test_ed25519_matches_rfc8032_vector(self):
        # RFC 8032 section 7.1, TEST 1 (empty message).
        seed = bytes.fromhex("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60")
        pub = bytes.fromhex("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a")
        expected = (
            "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155"
            "5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b"
        )
        self.assertEqual(ed25519.sign(seed, b""), expected)
        self.assertTrue(ed25519.verify(pub, b"", expected))

    def test_no_pure_python_fallback(self):
        import anza.crypto.ed25519 as mod
        for name in ("_py_sign", "_py_verify", "_HAS_CRYPTOGRAPHY", "_scalarmult"):
            self.assertFalse(hasattr(mod, name), name)

    def test_hkdf_key_derivation(self):
        master_secret = "user-jwt-signature-token-seed"
        key = hkdf.derive_key(master_secret, salt="session-salt", info="feed-stream", keylen=32)
        self.assertEqual(len(key), 32)

    def test_engine_automatic_hmac_signing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "feed").mkdir(parents=True, exist_ok=True)
            (root / "feed" / "card.html").write_text("<div>{{title}}</div>", encoding="utf-8")

            secret = "my-secure-hmac-key-1234567890123"
            engine = Setup(
                root=str(root),
                signing=SignOptions(mode="hmac", secret=secret),
            ).run()

            env = Fragment("feed/card.html", "feed", {"title": "Signed Item"}).run(engine)

            self.assertIsNotNone(env.sig)
            self.assertTrue(hmac.verify(secret, env.message(), env.sig))
            self.assertEqual(env.v, 2)


if __name__ == "__main__":
    unittest.main()
