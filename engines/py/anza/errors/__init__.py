from typing import Literal

ErrorCode = Literal["VALIDATION", "NOT_FOUND", "TEMPLATE", "CRYPTO", "INTERNAL"]


class AnzaError(Exception):
    def __init__(self, code: ErrorCode, message: str) -> None:
        super().__init__(f"[Anza:{code}] {message}")
        self.code = code
        self.message = message

    @classmethod
    def validation(cls, msg: str) -> "AnzaError":
        return cls("VALIDATION", msg)

    @classmethod
    def not_found(cls, msg: str) -> "AnzaError":
        return cls("NOT_FOUND", msg)

    @classmethod
    def template(cls, msg: str) -> "AnzaError":
        return cls("TEMPLATE", msg)

    @classmethod
    def crypto(cls, msg: str) -> "AnzaError":
        return cls("CRYPTO", msg)

    @classmethod
    def internal(cls, msg: str) -> "AnzaError":
        return cls("INTERNAL", msg)
