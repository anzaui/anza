import json
from ..models.envelope import Envelope


def format_event(envelope: Envelope) -> str:
    data_str = json.dumps(envelope.to_dict(), separators=(",", ":"))
    return f"event: template\ndata: {data_str}\n\n"
