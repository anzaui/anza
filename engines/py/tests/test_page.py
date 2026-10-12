"""Page routes only reach ``pages/``, malformed routes and names are refused
without touching the filesystem, and errors never echo paths (G5, G6)."""

import tempfile
import unittest
from pathlib import Path

from anza import AnzaError, Fragment, Page, Setup
from anza.engine.name import page_template, valid_name


class TestPages(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.root = self.dir / "root"
        (self.root / "pages").mkdir(parents=True)
        (self.root / "feed").mkdir(parents=True)
        (self.root / "pages" / "about.html").write_text("<h1>About</h1>", encoding="utf-8")
        (self.root / "feed" / "card.html").write_text("<p>card</p>", encoding="utf-8")
        (self.dir / "secret.html").write_text("<p>SECRET</p>", encoding="utf-8")
        (self.root / "secret.html").write_text("<p>ROOT-LEVEL</p>", encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def assertNotFound(self, engine, route):
        with self.assertRaises(AnzaError, msg=route) as ctx:
            Page(route).run(engine)
        self.assertEqual(ctx.exception.code, "NOT_FOUND", route)
        self.assertEqual(ctx.exception.message, "Page not found", route)

    def test_names(self):
        for ok in ("a.html", "feed/card.html", "a..b.html"):
            self.assertTrue(valid_name(ok), ok)
        for bad in ("", "/a.html", "a//b.html", "../a.html", "a/../b.html", "./a.html", "a\\b.html", "a\0.html", "a/"):
            self.assertFalse(valid_name(bad), repr(bad))
        self.assertEqual(page_template("/"), "pages/home.html")
        self.assertEqual(page_template("/a/b/"), "pages/a/b.html")
        self.assertIsNone(page_template("/../secret"))

    def test_unknown_routes_are_not_found_and_not_reflected(self):
        engine = Setup(root=str(self.root)).run()
        for route in ("/<script>alert('x')</script>", "/missing", '/"><img src=x>'):
            self.assertNotFound(engine, route)
        self.assertIn("<h1>About</h1>", Page("/about").run(engine).html)

    def test_routes_only_reach_pages(self):
        engine = Setup(root=str(self.root)).run()
        for route in ("/secret", "/../secret", "/../../secret", "/pages/../secret", "/./secret/..", "/..\\secret", "/feed/card", "/about\0"):
            self.assertNotFound(engine, route)

    def test_catch_all_never_serves_malformed_routes(self):
        (self.root / "pages" / "index.html").write_text("<p>INDEX</p>", encoding="utf-8")
        engine = Setup(root=str(self.root)).run()
        self.assertIn("INDEX", Page("/no/such/page").run(engine).html)
        self.assertIn("INDEX", Page("/secret").run(engine).html)
        self.assertNotFound(engine, "/../secret")

    def test_no_disk_loads_and_path_free_errors(self):
        engine = Setup(root=str(self.root)).run()
        before = len(engine.cache.templates)
        for name in ("../secret.html", "/feed/card.html", "feed\\card.html", "feed/./card.html", "feed//card.html", "a\0.html"):
            with self.assertRaises(AnzaError) as ctx:
                engine.get_template(name)
            self.assertEqual(ctx.exception.code, "VALIDATION", repr(name))
        # A file created after setup is not loaded on demand.
        (self.root / "late.html").write_text("<p>late</p>", encoding="utf-8")
        with self.assertRaises(AnzaError) as ctx:
            engine.get_template("late.html")
        self.assertEqual(ctx.exception.code, "NOT_FOUND")
        self.assertNotIn(str(self.dir), str(ctx.exception))
        self.assertEqual(len(engine.cache.templates), before)

    def test_fragment_allowlist(self):
        engine = Setup(root=str(self.root), fragments=["feed/"]).run()
        Fragment("feed/card.html", "main").run(engine)
        for name in ("secret.html", "pages/about.html"):
            with self.assertRaises(AnzaError) as ctx:
                Fragment(name, "main").run(engine)
            self.assertEqual(ctx.exception.message, f"Template '{name}' not found")
        self.assertIn("About", Page("/about").run(engine).html)


if __name__ == "__main__":
    unittest.main()
