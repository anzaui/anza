import unittest
from anza import Setup, Fragment, SignOptions
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

    def test_hkdf_key_derivation(self):
        master_secret = "user-jwt-signature-token-seed"
        key = hkdf.derive_key(master_secret, salt="session-salt", info="feed-stream", keylen=32)
        self.assertEqual(len(key), 32)

    def test_engine_automatic_hmac_signing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "feed").mkdir(parents=True, exist_ok=True)
            (root / "feed" / "card.html").write_text("<div>{{title}}</div>", encoding="utf-8")

            secret = "my-secure-hmac-key-123456789012"
            engine = Setup(
                root=str(root),
                signing=SignOptions(mode="hmac", secret=secret),
            ).run()

            env = Fragment("feed/card.html", "feed", {"title": "Signed Item"}).run(engine)

            self.assertIsNotNone(env.sig)
            self.assertTrue(hmac.verify(secret, env.message(), env.sig))


if __name__ == "__main__":
    unittest.main()
