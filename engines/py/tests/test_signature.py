"""Signature v2 golden fixtures, shared by all three engines (G4, GC1)."""

import json
import tempfile
import unittest
from pathlib import Path

from anza import AnzaError, Envelope, Fragment, Setup, SignOptions, VerifyKey, verify_envelope
from anza.crypto import ed25519, hmac

FIXTURE = json.loads((Path(__file__).resolve().parent / "fixtures" / "signature.json").read_text(encoding="utf-8"))
SECRET = FIXTURE["keys"]["hmac_secret"]
SEED = bytes.fromhex(FIXTURE["keys"]["ed25519_seed"])
PUBLIC = bytes.fromhex(FIXTURE["keys"]["ed25519_public"])


def mutate(mode, rule):
    verify = FIXTURE["verify"]
    base = next(c for c in FIXTURE["cases"] if c["name"] == verify["base"])
    env = dict(base["envelope"], sig=base[mode])
    for k, v in (rule.get("set") or {}).items():
        if v is None:
            env.pop(k, None)
        else:
            env[k] = v
    op = rule.get("sig", "keep")
    if op == "drop":
        env.pop("sig")
    elif op == "upper":
        env["sig"] = env["sig"].upper()
    elif op.startswith("append:"):
        env["sig"] += op[7:]
    elif op.startswith("literal:"):
        env["sig"] = op[8:]
    o = dict(verify["options"], **(rule.get("options") or {}))
    return env, dict(slot=o["slot"], max_age_secs=o["max_age_secs"], now=o["now"])


class TestSignatureV2(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "card.html").write_text("<b>{{x}}</b>", encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def test_message_and_signatures_match_the_golden_fixtures(self):
        for case in FIXTURE["cases"]:
            e = case["envelope"]
            env = Envelope(slot=e["slot"], ts=e["ts"], html=e["html"], css=e.get("css"))
            msg = env.message()
            self.assertEqual(msg.hex(), case["message_hex"], case["name"])
            self.assertEqual(hmac.sign(SECRET, msg), case["hmac"], case["name"])
            self.assertEqual(ed25519.sign(SEED, msg), case["ed25519"], case["name"])
        self.assertNotEqual(FIXTURE["cases"][3]["message_hex"], FIXTURE["cases"][4]["message_hex"])

    def test_verify_envelope_follows_the_golden_rules(self):
        hm = Setup(root=str(self.root), signing=SignOptions(mode="hmac", secret=SECRET)).run()
        ed = Setup(root=str(self.root), signing=SignOptions(mode="ed25519", private_key=SEED)).run()
        for mode, key, engine in (("hmac", VerifyKey.hmac(SECRET), hm), ("ed25519", VerifyKey.ed25519(PUBLIC), ed)):
            for rule in FIXTURE["verify"]["accept"]:
                env, opts = mutate(mode, rule)
                verify_envelope(key, env, **opts)
                engine.verify_envelope(env, **opts)
            for rule in FIXTURE["verify"]["reject"]:
                env, opts = mutate(mode, rule)
                for run in (lambda: verify_envelope(key, env, **opts), lambda: engine.verify_envelope(env, **opts)):
                    with self.assertRaises(AnzaError, msg=f"{mode} {rule['name']}") as ctx:
                        run()
                    self.assertEqual(ctx.exception.code, "CRYPTO")
                    self.assertEqual(ctx.exception.message, rule["reason"], f"{mode} {rule['name']}")

    def test_rendered_envelopes_are_v2_and_verify(self):
        engine = Setup(root=str(self.root), signing=SignOptions(mode="hmac", secret=SECRET)).run()
        env = Fragment("card.html", "feed", {"x": 1}).run(engine)
        self.assertEqual(env.v, 2)
        self.assertEqual(list(env.to_dict())[0], "v")
        verify_envelope(VerifyKey.hmac(SECRET), env, max_age_secs=60, slot="feed")
        verify_envelope(VerifyKey.hmac(SECRET), json.loads(json.dumps(env.to_dict())), max_age_secs=60, slot="feed")
        with self.assertRaises(AnzaError):
            verify_envelope(VerifyKey.hmac(SECRET), env, max_age_secs=60, slot="main")
        with self.assertRaisesRegex(AnzaError, "invalid verification key"):
            verify_envelope(VerifyKey.hmac("short"), env, max_age_secs=60, slot="feed")
        with self.assertRaisesRegex(AnzaError, "malformed envelope"):
            verify_envelope(VerifyKey.hmac(SECRET), dict(env.to_dict(), ts="1"), max_age_secs=60, slot="feed")
        self.assertNotIn(SECRET, repr(VerifyKey.hmac(SECRET)))


if __name__ == "__main__":
    unittest.main()
