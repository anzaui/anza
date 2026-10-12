import json
from typing import Any, Optional
from .escape import escape_html
from .parse import Chunk

_MAX_SAFE_INT = 2**53


def stringify(val: Any) -> Optional[str]:
    """A value as slot text (see ``docs/engines/contract.md``): strings as-is,
    ``true``/``false``, integers in decimal, integral floats without ``.0``,
    other floats via ``repr``, ``None`` as nothing, dicts/lists/tuples as
    compact JSON, anything else via ``str``."""
    if val is None:
        return None
    if isinstance(val, str):
        return val
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, int):
        return str(val)
    if isinstance(val, float):
        if val.is_integer() and abs(val) < _MAX_SAFE_INT:
            return str(int(val))
        return repr(val)
    if isinstance(val, (dict, list, tuple)):
        return json.dumps(val, separators=(",", ":"), ensure_ascii=False, default=str)
    return str(val)


def lookup(params: Any, key: str) -> Any:
    """The raw value of ``key`` in ``params`` (dict, ``(key, value)`` pairs, or
    an object's public, non-callable attribute)."""
    if params is None:
        return None
    if isinstance(params, dict):
        return params.get(key)
    if isinstance(params, (list, tuple)):
        for item in params:
            if isinstance(item, (list, tuple)) and len(item) == 2 and item[0] == key:
                return item[1]
        return None
    # Object / dataclass / model attribute. Private names and methods are
    # never read, so `{{__class__}}` or `{{__init__}}` render nothing.
    if key.startswith("_"):
        return None
    val = getattr(params, key, None)
    return None if callable(val) else val


def resolve_val(params: Any, key: str) -> Optional[str]:
    return stringify(lookup(params, key))


def _text(val: Any) -> str:
    if val.__class__ is str:
        return val
    s = stringify(val)
    return "" if s is None else s


def _as_dict(params: Any) -> Optional[dict]:
    """``params`` as a dict when that is cheaper than per-slot lookups."""
    if isinstance(params, dict):
        return params
    if isinstance(params, (list, tuple)):
        out: dict = {}
        for item in params:
            if isinstance(item, (list, tuple)) and len(item) == 2:
                out.setdefault(item[0], item[1])
        return out
    return None


_STR_ONLY = {str}


class Renderer:
    """A template compiled once: the static text becomes a ``%``-format
    pattern and the slots a tuple of keys. A render is one C-level lookup per
    slot, one type check over the values (all strings: no conversion at all)
    and a single ``%`` call."""

    __slots__ = ("pattern", "keys", "escaped", "empty")

    def __init__(self, chunks: list[Chunk], escape: bool = False) -> None:
        pieces: list[str] = []
        keys: list[str] = []
        escaped: list[int] = []
        for chunk in chunks:
            if chunk.kind == "static":
                pieces.append(chunk.value.replace("%", "%%"))
            else:
                pieces.append("%s")
                if escape and chunk.kind == "slot":
                    escaped.append(len(keys))
                keys.append(chunk.value)
        self.pattern = "".join(pieces)
        self.keys = tuple(keys)
        #: Positions of the slots to HTML-escape.
        self.escaped = tuple(escaped)
        self.empty = self.pattern % (("",) * len(keys))

    def __call__(self, params: Any = None) -> str:
        if params is None:
            return self.empty
        mapping = _as_dict(params)
        if mapping is not None:
            values = tuple(map(mapping.get, self.keys))
        else:
            values = tuple(lookup(params, key) for key in self.keys)
        if set(map(type, values)) - _STR_ONLY:
            values = tuple(v if v.__class__ is str else _text(v) for v in values)
        if self.escaped:
            listed = list(values)
            for i in self.escaped:
                listed[i] = escape_html(listed[i])
            values = tuple(listed)
        return self.pattern % values


def string(chunks: list[Chunk], params: Any = None, escape: bool = False) -> str:
    """Bind ``params`` into ``chunks``. With ``escape``, ``{{slot}}`` values
    are HTML-escaped; ``{{{raw}}}`` values never are. Compiles each call:
    keep a ``Template`` (or a ``Renderer``) to bind repeatedly."""
    return Renderer(chunks, escape)(params)
