import time
from typing import Any, Optional
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

    envelope.sig = engine.signer.sign(envelope.message().encode("utf-8"))

    return envelope
