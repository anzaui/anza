from typing import Any, Optional

from ..engine.cache.engine import Engine
from ..engine.name import page_template
from ..errors import AnzaError
from ..models.document import Document

#: The document used when the root has no ``layout/shell.html``, split around the page.
DEFAULT_SHELL = (
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n'
    '  <meta name="viewport" content="width=device-width, initial-scale=1">\n'
    "  <title>Anza App</title>\n</head>\n<body>\n  <dock-main>\n"
    '    <template shadowrootmode="open">\n      <slot></slot>\n    </template>\n    ',
    "\n  </dock-main>\n</body>\n</html>",
)


def _shell_params(params: Any) -> dict[str, Any]:
    if params is None:
        return {}
    if isinstance(params, dict):
        return dict(params)
    if isinstance(params, (list, tuple)):
        return {item[0]: item[1] for item in params if isinstance(item, (list, tuple)) and len(item) == 2}
    if hasattr(params, "__dict__"):
        return dict(vars(params))
    return {}


def render_page(engine: Engine, route: str, params: Any = None) -> Document:
    """Render the page for ``route`` (see ``docs/engines/contract.md``):

    1. ``/`` is ``pages/home.html``, ``/a/b`` is ``pages/a/b.html``.
    2. Unknown routes use ``pages/index.html`` (the catch-all) when it exists.
    3. Otherwise (or for a malformed route) it raises ``NOT_FOUND``.
    4. The page goes into ``layout/shell.html`` as ``{{content}}``, or into a
       minimal default document when there is no shell.
    """
    name: Optional[str] = page_template(route)
    page = None
    if name is not None:
        page = engine.cache.get(name) or engine.cache.get("pages/index.html")
    if page is None:
        raise AnzaError.not_found("Page not found")
    content = page.bind(params)

    shell = engine.cache.get("layout/shell.html")
    if shell is None:
        return Document(html=DEFAULT_SHELL[0] + content + DEFAULT_SHELL[1])

    shell_params = _shell_params(params)
    shell_params["content"] = content
    return Document(html=shell.bind(shell_params))
