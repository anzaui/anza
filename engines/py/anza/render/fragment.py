import time
from typing import Any, Optional
from ..crypto import hmac as anza_hmac, ed25519 as anza_ed25519
from ..errors import AnzaError
from ..models.envelope import Envelope
from ..engine.cache.engine import Engine


def render_fragment(
    engine: Engine,
    template_name: str,
    slot: str,
    params: Any = None,
) -> Envelope:
    tpl = engine.get_template(template_name)
    html = tpl.bind(params)
    ts = int(time.time())

    envelope = Envelope(
        slot=slot,
        ts=ts,
        html=html,
        sig=None,
        css=None,
    )

    # Cryptographic signing
    mode = engine.signing.mode
    if mode == "hmac":
        if not engine.signing.secret:
            raise AnzaError.crypto("HMAC signing enabled but no secret key provided")
        envelope.sig = anza_hmac.sign(engine.signing.secret, envelope.message())
    elif mode == "ed25519":
        if not engine.signing.private_key:
            raise AnzaError.crypto("Ed25519 signing enabled but no private key provided")
        envelope.sig = anza_ed25519.sign(engine.signing.private_key, envelope.message())

    return envelope
