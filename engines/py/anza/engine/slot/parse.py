from dataclasses import dataclass
from typing import Literal
from ...errors import AnzaError


@dataclass(frozen=True)
class Chunk:
    """``static`` text, a ``slot`` (``{{name}}``, escaped when the engine runs
    with ``escape=True``) or a ``raw`` slot (``{{{name}}}``, never escaped)."""

    kind: Literal["static", "slot", "raw"]
    value: str


def extract(template: str) -> list[Chunk]:
    """Split a template into static text and ``{{slot}}`` / ``{{{raw}}}`` chunks."""
    chunks: list[Chunk] = []
    cursor = 0
    length = len(template)

    while cursor < length:
        open_idx = template.find("{{", cursor)
        if open_idx == -1:
            chunks.append(Chunk(kind="static", value=template[cursor:]))
            break

        if open_idx > cursor:
            chunks.append(Chunk(kind="static", value=template[cursor:open_idx]))

        raw = template.startswith("{", open_idx + 2)
        start = open_idx + (3 if raw else 2)
        close = "}}}" if raw else "}}"
        close_idx = template.find(close, start)
        if close_idx == -1:
            if raw:
                raise AnzaError.template("Unclosed raw slot placeholder '{{{' in template")
            raise AnzaError.template("Unclosed slot placeholder '{{' in template")

        slot_name = template[start:close_idx].strip()
        if not slot_name:
            raise AnzaError.template("Empty slot placeholder {{}} in template")

        chunks.append(Chunk(kind="raw" if raw else "slot", value=slot_name))
        cursor = close_idx + len(close)

    return chunks
