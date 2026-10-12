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

HERE = Path(__file__).parent


def write_json(name: str, data: dict) -> None:
    path = HERE / name
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path}")


write_json("signature.json", out)

# ---------------------------------------------------------------- rendering
# Template roots under render/<root>/ and the expected output of each engine.

ROOTS = {
    "basic": {
        "values.html": (
            "s={{s}} i={{i}} f={{f}} g={{g}} neg={{neg}} t={{t}} b={{b}} n={{n}} "
            "missing={{missing}} arr={{arr}} obj={{obj}} u={{u}} raw={{{s}}}"
        ),
        "feed/card.html": '<ui-card title="{{ title }}">{{body}}</ui-card>',
    },
    "shell": {
        "layout/shell.html": "<html><title>{{title}}</title><main>{{{content}}}</main></html>",
        "pages/home.html": "<h1>{{title}}</h1>",
        "pages/docs/intro.html": "<article>{{title}}: intro</article>",
        "pages/index.html": "<p>catch-all {{title}}</p>",
    },
    "plain": {
        "pages/home.html": "<h1>{{title}}</h1>",
    },
}

DEFAULT_SHELL = (
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n'
    '  <meta name="viewport" content="width=device-width, initial-scale=1">\n'
    "  <title>Anza App</title>\n</head>\n<body>\n  <dock-main>\n"
    '    <template shadowrootmode="open">\n      <slot></slot>\n    </template>\n    ',
    "\n  </dock-main>\n</body>\n</html>",
)

for root_name, root_files in ROOTS.items():
    for rel, text in root_files.items():
        target = HERE / "render" / root_name / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")

S = "<b>&'\""
VALUES = {
    "s": S,
    "i": 42,
    "f": 1.5,
    "g": 3.0,
    "neg": -7,
    "t": True,
    "b": False,
    "n": None,
    "arr": [1, "a", True, None],
    "obj": {"a": 1, "b": "x"},
    "u": "café",
}
REST = ' i=42 f=1.5 g=3 neg=-7 t=true b=false n= missing= {arr} {obj} u=café raw=' + S
VALUES_TEXT = "s=" + S + REST.format(arr='arr=[1,"a",true,null]', obj='obj={"a":1,"b":"x"}')
VALUES_ESCAPED = "s=&lt;b&gt;&amp;&#39;&quot;" + REST.format(
    arr="arr=[1,&quot;a&quot;,true,null]",
    obj="obj={&quot;a&quot;:1,&quot;b&quot;:&quot;x&quot;}",
)

SSE_ENV = {"v": 2, "slot": "feed", "ts": 1724771234, "html": '<p class="x">café "q"\t\n</p>', "sig": "ab" * 32}
SSE_JSON = json.dumps(SSE_ENV, separators=(",", ":"), ensure_ascii=False)

render = {
    "contract": "docs/engines/contract.md",
    "roots": "render/<root>/",
    "fragments": [
        {"name": "values", "root": "basic", "template": "values.html", "params": VALUES, "html": VALUES_TEXT},
        {"name": "values escaped", "root": "basic", "template": "values.html", "params": VALUES, "escape": True, "html": VALUES_ESCAPED},
        {"name": "trimmed slot names", "root": "basic", "template": "feed/card.html", "params": {"title": "T", "body": "B"}, "html": '<ui-card title="T">B</ui-card>'},
        {"name": "no params", "root": "basic", "template": "feed/card.html", "params": None, "html": '<ui-card title=""></ui-card>'},
    ],
    "pages": [
        {"name": "home in shell", "root": "shell", "route": "/", "params": {"title": "Home"}, "html": "<html><title>Home</title><main><h1>Home</h1></main></html>"},
        {"name": "nested page", "root": "shell", "route": "/docs/intro/", "params": {"title": "Docs"}, "html": "<html><title>Docs</title><main><article>Docs: intro</article></main></html>"},
        {"name": "catch-all", "root": "shell", "route": "/no/such/page", "params": {"title": "X"}, "html": "<html><title>X</title><main><p>catch-all X</p></main></html>"},
        {"name": "engine owns content", "root": "shell", "route": "/", "params": {"title": "T", "content": "EVIL"}, "html": "<html><title>T</title><main><h1>T</h1></main></html>"},
        {"name": "traversal", "root": "shell", "route": "/../secret", "params": {}, "error": "NOT_FOUND"},
        {"name": "default shell", "root": "plain", "route": "/", "params": {"title": "Plain"}, "html": DEFAULT_SHELL[0] + "<h1>Plain</h1>" + DEFAULT_SHELL[1]},
        {"name": "unknown route", "root": "plain", "route": "/missing", "params": {}, "error": "NOT_FOUND"},
    ],
    "sse": [{"envelope": SSE_ENV, "packet": SSE_JSON, "frame": "event: template\ndata: " + SSE_JSON + "\n\n"}],
    "manifest": {
        "root": "basic",
        "templates": {rel: hashlib.sha256(text.encode("utf-8")).hexdigest() for rel, text in ROOTS["basic"].items()},
    },
}

write_json("render.json", render)
