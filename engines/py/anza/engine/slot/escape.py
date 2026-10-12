"""HTML escaping, identical in all three engines: ``&`` ``<`` ``>`` ``"`` ``'``
become ``&amp;`` ``&lt;`` ``&gt;`` ``&quot;`` ``&#39;``. Safe for element
content and quoted attribute values. (``html.escape`` writes ``&#x27;``.)"""

_TABLE = str.maketrans({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})


def escape_html(text: str) -> str:
    return text.translate(_TABLE)
