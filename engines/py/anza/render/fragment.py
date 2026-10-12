import time
from typing import Any, Optional
from ..engine.name import fragment_allowed
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
    if not fragment_allowed(engine.fragments, template_name):
        raise AnzaError.not_found(f"Template '{template_name}' not found")
    html = tpl.bind(params)
    ts = int(time.time())

    envelope = Envelope(
        slot=slot,
        ts=ts,
        html=html,
        sig=None,
        css=None,
    )

    if engine.signer.mode != "none":
        envelope.sig = engine.signer.sign(envelope.message())

    return envelope
