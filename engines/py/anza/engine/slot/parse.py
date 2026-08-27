from dataclasses import dataclass
from typing import Literal
from ...errors import AnzaError


@dataclass(frozen=True)
class Chunk:
    kind: Literal["static", "slot"]
    value: str


def extract(template: str) -> list[Chunk]:
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

        close_idx = template.find("}}", open_idx + 2)
        if close_idx == -1:
            raise AnzaError.template("Unclosed slot placeholder '{{' in template")

        slot_name = template[open_idx + 2 : close_idx].strip()
        if not slot_name:
            raise AnzaError.template("Empty slot placeholder {{}} in template")

        chunks.append(Chunk(kind="slot", value=slot_name))
        cursor = close_idx + 2

    return chunks
