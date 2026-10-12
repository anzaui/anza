"""Template names and page routes (see ``docs/engines/contract.md``).

A template name is a relative, ``/``-separated path under the template root:
not empty, no leading ``/``, no ``\\`` or NUL, and no empty, ``.`` or ``..``
segment. Names are only ever looked up in the in-memory cache; request input
never reaches the filesystem.
"""

from typing import Optional, Sequence


def valid_name(name: str) -> bool:
    """Whether ``name`` is a well-formed template name."""
    if not isinstance(name, str) or not name or name.startswith("/") or "\\" in name or "\0" in name:
        return False
    return all(seg not in ("", ".", "..") for seg in name.split("/"))


def page_template(route: str) -> Optional[str]:
    """The page template for a request route: ``/`` is ``pages/home.html``,
    ``/a/b`` is ``pages/a/b.html``. ``None`` when the route is not a valid name."""
    clean = str(route).strip("/")
    if not clean:
        return "pages/home.html"
    return f"pages/{clean}.html" if valid_name(clean) else None


def fragment_allowed(allow: Sequence[str], name: str) -> bool:
    """Whether a fragment may render ``name`` under the ``fragments``
    allowlist: empty allows every template; an entry ending in ``/`` allows
    that prefix, any other entry allows that exact name."""
    if not allow:
        return True
    return any(name.startswith(e) if e.endswith("/") else name == e for e in allow)
