"""Regenerate signature.json from the contract (docs/engines/contract.md).

Independent of the engines: builds the v2 message by hand and signs with
hashlib / cryptography. Run: python3 engines/fixtures/generate.py
"""

import hashlib
import hmac
import json
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

HMAC_SECRET = "anza-golden-hmac-secret-0123456789"
SEED = bytes(range(32))
NOW = 1724771300


def field(value: str) -> bytes:
    raw = value.encode("utf-8")
    return str(len(raw)).encode("ascii") + b":" + raw + b"\n"


def message(env: dict) -> bytes:
    return (
        b"anza-sig-v2\n"
        + field(str(env["ts"]))
        + field(env["slot"])
        + field(env["html"])
        + field(env.get("css") or "")
    )


key = Ed25519PrivateKey.from_private_bytes(SEED)
public = key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)

envelopes = [
    ("basic", {"v": 2, "slot": "feed", "ts": 1724771234, "html": "<ui-card>Live</ui-card>"}),
    ("css and unicode", {"v": 2, "slot": "main", "ts": 1724771299, "html": "<p class=\"x\">café ü \U0001F600\nline</p>", "css": ".x{color:red}"}),
    ("empty html", {"v": 2, "slot": "s", "ts": 0, "html": ""}),
    ("colon in slot", {"v": 2, "slot": "a:b", "ts": 1, "html": "c"}),
    ("colon in html", {"v": 2, "slot": "a", "ts": 1, "html": "b:c"}),
]

cases = []
for name, env in envelopes:
    msg = message(env)
    cases.append(
        {
            "name": name,
            "envelope": env,
            "message_hex": msg.hex(),
            "hmac": hmac.new(HMAC_SECRET.encode(), msg, hashlib.sha256).hexdigest(),
            "ed25519": key.sign(msg).hex(),
        }
    )

# Mutations of case 0 ("basic", slot "feed", ts NOW-66) checked by every engine's
# verify_envelope. `set`: replace fields (null removes the field). `sig`:
# keep | drop | append:<s> | upper | literal:<s>. `options` override the defaults.
verify = {
    "base": "basic",
    "options": {"slot": "feed", "max_age_secs": 120, "now": NOW},
    "accept": [
        {"name": "fresh", "options": {}},
        {"name": "exactly max age", "options": {"max_age_secs": 66}},
        {"name": "within future skew", "options": {"now": 1724771230}},
    ],
    "reject": [
        {"name": "v1 envelope", "set": {"v": 1}, "reason": "unsupported envelope version"},
        {"name": "no version", "set": {"v": None}, "reason": "unsupported envelope version"},
        {"name": "unsigned", "sig": "drop", "reason": "envelope is not signed"},
        {"name": "sig + zz", "sig": "append:zz", "reason": "malformed signature"},
        {"name": "non-ascii sig", "sig": "literal:€a", "reason": "malformed signature"},
        {"name": "uppercase sig", "sig": "upper", "reason": "malformed signature"},
        {"name": "sig + 00", "sig": "append:00", "reason": "bad signature"},
        {"name": "expired", "options": {"max_age_secs": 65}, "reason": "envelope expired"},
        {"name": "future", "options": {"now": 1724771228}, "reason": "envelope timestamp is in the future"},
        {"name": "other slot", "options": {"slot": "main"}, "reason": "slot mismatch"},
        {"name": "moved slot", "set": {"slot": "main"}, "options": {"slot": "main"}, "reason": "bad signature"},
        {"name": "tampered html", "set": {"html": "<ui-card>Evil</ui-card>"}, "reason": "bad signature"},
        {"name": "tampered ts", "set": {"ts": 1724771235}, "reason": "bad signature"},
        {"name": "injected css", "set": {"css": "*{display:none}"}, "reason": "bad signature"},
    ],
}

out = {
    "contract": "docs/engines/contract.md",
    "keys": {
        "hmac_secret": HMAC_SECRET,
        "ed25519_seed": SEED.hex(),
        "ed25519_public": public.hex(),
    },
    "cases": cases,
    "verify": verify,
}

path = Path(__file__).with_name("signature.json")
path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"wrote {path}")
