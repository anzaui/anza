"""Template size cap, symlinks out of the root, and the watcher (G10, GC1)."""

import os
import tempfile
import time
import unittest
from pathlib import Path

from anza import AnzaError, Setup


def wait_for(ok, seconds=5.0):
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        if ok():
            return True
        time.sleep(0.02)
    return False


class TestLimits(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.root = self.dir / "root"
        self.root.mkdir()

    def tearDown(self):
        self.tmp.cleanup()

    def test_oversized_templates_fail_setup(self):
        (self.root / "big.html").write_text("x" * (1024 * 1024 + 1), encoding="utf-8")
        with self.assertRaises(AnzaError) as ctx:
            Setup(root=str(self.root)).run()
        self.assertEqual(ctx.exception.code, "TEMPLATE")
        self.assertIn("big.html", str(ctx.exception))
        self.assertNotIn(str(self.dir), str(ctx.exception))
        (self.root / "big.html").write_text("x" * (1024 * 1024), encoding="utf-8")
        Setup(root=str(self.root)).run()
        with self.assertRaisesRegex(AnzaError, "larger than 1024 bytes"):
            Setup(root=str(self.root), max_template_bytes=1024).run()

    @unittest.skipUnless(hasattr(os, "symlink"), "needs symlinks")
    def test_symlinks_out_of_the_root_are_not_followed(self):
        (self.dir / "outside").mkdir()
        (self.dir / "outside" / "secret.html").write_text("<p>SECRET</p>", encoding="utf-8")
        (self.root / "real.html").write_text("<p>real</p>", encoding="utf-8")
        os.symlink(self.dir / "outside" / "secret.html", self.root / "leak.html")
        os.symlink(self.dir / "outside", self.root / "linked")
        os.symlink(self.root / "real.html", self.root / "alias.html")
        engine = Setup(root=str(self.root)).run()
        self.assertEqual(sorted(engine.cache.keys()), ["alias.html", "real.html"])

    def test_watch_reloads_edits_additions_and_removals(self):
        (self.root / "card.html").write_text("<p>{{v}} one</p>", encoding="utf-8")
        engine = Setup(root=str(self.root), watch=True).run()
        try:
            render = lambda name: engine.cache.get(name).bind({"v": "x"}) if engine.cache.get(name) else None  # noqa: E731
            self.assertEqual(render("card.html"), "<p>x one</p>")

            (self.root / "card.html").write_text("<p>{{v}} two!</p>", encoding="utf-8")
            self.assertTrue(wait_for(lambda: render("card.html") == "<p>x two!</p>"), "edit not reloaded")

            (self.root / "new.html").write_text("<b>{{v}}</b>", encoding="utf-8")
            self.assertTrue(wait_for(lambda: render("new.html") == "<b>x</b>"), "new template not loaded")

            (self.root / "card.html").unlink()
            self.assertTrue(wait_for(lambda: engine.cache.get("card.html") is None), "removed template still cached")
        finally:
            engine.close()
        self.assertIsNone(engine.watcher)


if __name__ == "__main__":
    unittest.main()
