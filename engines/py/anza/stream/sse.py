from ..models.envelope import Envelope


def format_event(envelope: Envelope) -> str:
    return f"event: template\ndata: {envelope.to_json()}\n\n"
