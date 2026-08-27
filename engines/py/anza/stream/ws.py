import json
from ..models.envelope import Envelope


def format_packet(envelope: Envelope) -> str:
    return json.dumps(envelope.to_dict(), separators=(",", ":"))
