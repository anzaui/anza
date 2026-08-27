import tempfile
import unittest
from pathlib import Path
from anza import Setup, Page, Fragment, Stream, extract, string, Chunk


class TestAnzaEngine(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)

        # Create templates structure
        (self.root / "layout").mkdir(parents=True, exist_ok=True)
        (self.root / "pages").mkdir(parents=True, exist_ok=True)
        (self.root / "feed").mkdir(parents=True, exist_ok=True)

        # Write templates
        (self.root / "layout" / "shell.html").write_text(
            "<!DOCTYPE html><html><head><title>{{title}}</title></head><body><main>{{content}}</main></body></html>",
            encoding="utf-8",
        )
        (self.root / "pages" / "home.html").write_text(
            '<section class="hero"><h1>{{title}}</h1><p>Count: {{count}}</p></section>',
            encoding="utf-8",
        )
        (self.root / "feed" / "card.html").write_text(
            '<article id="card-{{id}}"><h2>{{title}}</h2></article>',
            encoding="utf-8",
        )

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_extract_and_bind_slots(self):
        template = "Hello, {{name}}! Welcome to {{place}}."
        chunks = extract(template)
        self.assertEqual(len(chunks), 5)
        self.assertEqual(chunks[0], Chunk(kind="static", value="Hello, "))
        self.assertEqual(chunks[1], Chunk(kind="slot", value="name"))
        self.assertEqual(chunks[2], Chunk(kind="static", value="! Welcome to "))
        self.assertEqual(chunks[3], Chunk(kind="slot", value="place"))
        self.assertEqual(chunks[4], Chunk(kind="static", value="."))

        result = string(chunks, {"name": "Aduki", "place": "Anza"})
        self.assertEqual(result, "Hello, Aduki! Welcome to Anza.")

    def test_full_page_ssr_with_open_dsd(self):
        engine = Setup(root=str(self.root)).run()
        doc = Page("/", {"title": "Anza Home", "count": 42}).run(engine)

        self.assertIn("<title>Anza Home</title>", doc.html)
        self.assertIn('<page-home><template shadowrootmode="open">', doc.html)
        self.assertIn("<h1>Anza Home</h1>", doc.html)
        self.assertIn("<p>Count: 42</p>", doc.html)
        self.assertIn("</template></page-home>", doc.html)

    def test_fragment_rendering(self):
        engine = Setup(root=str(self.root)).run()
        envelope = Fragment("feed/card.html", "feed", {"id": "101", "title": "First Card"}).run(engine)

        self.assertEqual(envelope.slot, "feed")
        self.assertEqual(envelope.html, '<article id="card-101"><h2>First Card</h2></article>')
        self.assertGreater(envelope.ts, 0)

    def test_stream_event_formatting(self):
        engine = Setup(root=str(self.root)).run()
        sse_chunk = Stream("feed/card.html", "feed", {"id": "102", "title": "Streamed Card"}).run(engine)

        self.assertTrue(sse_chunk.startswith("event: template\ndata: {"))
        self.assertIn('"slot":"feed"', sse_chunk)
        self.assertIn('"html":"<article id=\\"card-102\\"><h2>Streamed Card</h2></article>"', sse_chunk)
        self.assertTrue(sse_chunk.endswith("\n\n"))


if __name__ == "__main__":
    unittest.main()
