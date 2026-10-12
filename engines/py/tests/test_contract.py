"""Rendering golden fixtures, shared by all three engines (GC1): value
stringification, escaping, the page pipeline, SSE/WS framing and manifest
digests."""

import json
import unittest
from pathlib import Path

from anza import AnzaError, Envelope, Fragment, Page, Setup, format_event, format_packet

FIXTURES = Path(__file__).resolve().parent / "fixtures"
FX = json.loads((FIXTURES / "render.json").read_text(encoding="utf-8"))


def root(name):
    return str(FIXTURES / "render" / name)


class TestContract(unittest.TestCase):
    def test_fragments(self):
        for c in FX["fragments"]:
            engine = Setup(root=root(c["root"]), escape=bool(c.get("escape"))).run()
            self.assertEqual(engine.get_template(c["template"]).bind(c["params"]), c["html"], c["name"])
            self.assertEqual(Fragment(c["template"], "main", c["params"]).run(engine).html, c["html"], c["name"])
            if c["params"]:
                pairs = list(c["params"].items())
                self.assertEqual(engine.get_template(c["template"]).bind(pairs), c["html"], c["name"])

    def test_pages(self):
        for c in FX["pages"]:
            engine = Setup(root=root(c["root"])).run()
            if "error" in c:
                with self.assertRaises(AnzaError, msg=c["name"]) as ctx:
                    Page(c["route"], c["params"]).run(engine)
                self.assertEqual(ctx.exception.code, c["error"], c["name"])
            else:
                self.assertEqual(Page(c["route"], c["params"]).run(engine).html, c["html"], c["name"])

    def test_sse_and_ws_framing(self):
        for c in FX["sse"]:
            e = c["envelope"]
            env = Envelope(slot=e["slot"], ts=e["ts"], html=e["html"], sig=e.get("sig"), css=e.get("css"))
            self.assertEqual(format_event(env), c["frame"])
            self.assertEqual(format_packet(env), c["packet"])

    def test_manifest(self):
        engine = Setup(root=root(FX["manifest"]["root"])).run()
        self.assertEqual(engine.cache.manifest().templates, FX["manifest"]["templates"])

    def test_error_format(self):
        self.assertEqual(str(AnzaError.not_found("Page not found")), "[Anza:NOT_FOUND] Page not found")


if __name__ == "__main__":
    unittest.main()
