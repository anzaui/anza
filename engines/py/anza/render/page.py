import re
from typing import Any
from ..models.document import Document
from ..engine.cache.engine import Engine


def render_page(engine: Engine, route: str, params: Any = None) -> Document:
    clean_route = route.strip("/").lower()
    page_rel = f"pages/{clean_route}.html" if clean_route else "pages/home.html"

    # 1. Fetch shell and page templates
    shell_tpl = engine.get_template("layout/shell.html")
    page_tpl = engine.get_template(page_rel)

    # 2. Render inner page
    inner_html = page_tpl.bind(params)

    # 3. Parameter dictionary for global shell
    shell_params: dict[str, Any] = {}
    if isinstance(params, dict):
        shell_params = dict(params)
    elif params is not None:
        # Dataclass or object attributes
        if hasattr(params, "__dict__"):
            shell_params = dict(params.__dict__)
        else:
            for k in dir(params):
                if not k.startswith("_"):
                    val = getattr(params, k)
                    if not callable(val):
                        shell_params[k] = val

    # Route name for custom element tag
    route_name = clean_route if clean_route else "home"
    tag_name = f"page-{route_name}"

    # Construct Open Declarative Shadow DOM
    dsd_content = f'<{tag_name}><template shadowrootmode="open">{inner_html}</template></{tag_name}>'

    shell_params["content"] = dsd_content
    shell_params["main"] = dsd_content
    shell_params["body"] = dsd_content
    shell_params["route"] = route

    # 4. Render shell wrapper
    full_html = shell_tpl.bind(shell_params)

    return Document(html=full_html)
