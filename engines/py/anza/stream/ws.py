from ..models.envelope import Envelope


def format_packet(envelope: Envelope) -> str:
    return envelope.to_json()
