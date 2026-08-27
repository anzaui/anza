from dataclasses import dataclass


@dataclass
class Document:
    html: str

    def __str__(self) -> str:
        return self.html

    def to_bytes(self) -> bytes:
        return self.html.encode("utf-8")
