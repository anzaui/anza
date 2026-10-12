"""Opt-in HTML escaping (``{{x}}`` escaped, ``{{{x}}}`` raw) and attribute
lookups that never reach private names or methods (G9)."""

import tempfile
import unittest
from pathlib import Path

from anza import AnzaError, Chunk, Fragment, Setup, escape_html, extract, string

EVIL = "<script>alert('x')</script> & \"q\""
ESCAPED = "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;q&quot;"


class TestEscape(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "card.html").write_text('<p title="{{x}}">{{x}}</p><div>{{{x}}}</div>', encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def test_escape_html_is_shared(self):
        self.assertEqual(escape_html(EVIL), ESCAPED)
        self.assertEqual(escape_html("plain"), "plain")

    def test_escape_true_escapes_double_braces_only(self):
        engine = Setup(root=str(self.root), escape=True).run()
        html = Fragment("card.html", "main", {"x": EVIL}).run(engine).html
        self.assertEqual(html, f'<p title="{ESCAPED}">{ESCAPED}</p><div>{EVIL}</div>')

    def test_escape_off_by_default(self):
        engine = Setup(root=str(self.root)).run()
        html = Fragment("card.html", "main", {"x": EVIL}).run(engine).html
        self.assertEqual(html, f'<p title="{EVIL}">{EVIL}</p><div>{EVIL}</div>')

    def test_triple_braces_parse(self):
        self.assertEqual(
            extract("a{{{ b }}}c{{d}}"),
            [Chunk("static", "a"), Chunk("raw", "b"), Chunk("static", "c"), Chunk("slot", "d")],
        )
        with self.assertRaises(AnzaError):
            extract("{{{x}}")

    def test_private_names_and_methods_are_never_read(self):
        class Model:
            def __init__(self):
                self.own = "field"

            def method(self):
                return "called"

        out = string(extract("[{{own}}][{{__class__}}][{{__init__}}][{{method}}][{{_x}}]"), Model())
        self.assertEqual(out, "[field][][][][]")


if __name__ == "__main__":
    unittest.main()
