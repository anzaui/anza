"""Signing keys are validated at setup and never printed (G2, G7)."""

import tempfile
import unittest
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from anza import AnzaError, Fragment, Setup, SignOptions
from anza.crypto.signer import raw_public_key

SEED = bytes([7]) * 32


class TestKeys(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "card.html").write_text("<p>{{x}}</p>", encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def assertCrypto(self, signing):
        with self.assertRaises(AnzaError) as ctx:
            Setup(root=str(self.root), signing=signing).run()
        self.assertEqual(ctx.exception.code, "CRYPTO")

    def test_hmac_secret_must_be_at_least_32_bytes(self):
        self.assertCrypto(SignOptions(mode="hmac"))
        self.assertCrypto(SignOptions(mode="hmac", secret=""))
        self.assertCrypto(SignOptions(mode="hmac", secret="x" * 31))
        self.assertCrypto(SignOptions(mode="hmac", secret=b"x" * 31))
        engine = Setup(root=str(self.root), signing=SignOptions(mode="hmac", secret="x" * 32)).run()
        self.assertIsNotNone(Fragment("card.html", "main", {}).run(engine).sig)

    def test_ed25519_seed_must_be_32_bytes(self):
        self.assertCrypto(SignOptions(mode="ed25519"))
        self.assertCrypto(SignOptions(mode="ed25519", private_key=b"\x07" * 31))
        self.assertCrypto(SignOptions(mode="ed25519", private_key=b"\x07" * 64))
        self.assertCrypto(SignOptions(mode="ed25519", private_key="not a key"))
        self.assertCrypto(SignOptions(mode="ed25519", private_key="AB" * 32))
        for key in (SEED, SEED.hex(), Ed25519PrivateKey.from_private_bytes(SEED)):
            engine = Setup(root=str(self.root), signing=SignOptions(mode="ed25519", private_key=key)).run()
            self.assertEqual(len(Fragment("card.html", "main", {}).run(engine).sig), 128)

    def test_ed25519_public_key_must_match(self):
        pub = raw_public_key(Ed25519PrivateKey.from_private_bytes(SEED))
        Setup(root=str(self.root), signing=SignOptions(mode="ed25519", private_key=SEED, public_key=pub)).run()
        other = raw_public_key(Ed25519PrivateKey.generate())
        self.assertCrypto(SignOptions(mode="ed25519", private_key=SEED, public_key=other))
        self.assertCrypto(SignOptions(mode="ed25519", private_key=SEED, public_key=b"\x00" * 31))

    def test_repr_never_prints_keys(self):
        secret = "this-is-a-very-secret-hmac-key-0"
        setup = Setup(root=str(self.root), signing=SignOptions(mode="hmac", secret=secret))
        engine = setup.run()
        for printed in (repr(setup), repr(setup.signing), repr(engine), repr(engine.signer)):
            self.assertNotIn("very-secret", printed)
        setup = Setup(root=str(self.root), signing=SignOptions(mode="ed25519", private_key=SEED.hex()))
        engine = setup.run()
        for printed in (repr(setup), repr(engine), repr(engine.signer)):
            self.assertNotIn("0707070707", printed)
            self.assertNotIn("\\x07", printed)


if __name__ == "__main__":
    unittest.main()
