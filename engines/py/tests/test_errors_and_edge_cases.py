import unittest
import tempfile
from dataclasses import dataclass
from pathlib import Path
from anza import (
    Setup,
    Page,
    Fragment,
    Stream,
    AnzaError,
    extract,
    string,
    Document,
    Envelope,
    Manifest,
    SignOptions,
)


@dataclass
class Author:
    name: str
    role: str


class CustomArticle:
    def __init__(self, title: str, author: Author):
        self.title = title
        self.author = author


class TestErrorsAndEdgeCases(unittest.TestCase):
    def test_error_factories(self):
        err_val = AnzaError.validation("Invalid input")
        self.assertEqual(err_val.code, "VALIDATION")
        self.assertIn("Invalid input", str(err_val))

        err_nf = AnzaError.not_found("Template missing")
        self.assertEqual(err_nf.code, "NOT_FOUND")

        err_tpl = AnzaError.template("Syntax error")
        self.assertEqual(err_tpl.code, "TEMPLATE")

        err_crypto = AnzaError.crypto("Signature failed")
        self.assertEqual(err_crypto.code, "CRYPTO")

        err_internal = AnzaError.internal("Fatal error")
        self.assertEqual(err_internal.code, "INTERNAL")

    def test_setup_validation_errors(self):
        with self.assertRaises(AnzaError) as ctx:
            Setup(root="/path/does/not/exist/at/all/12345").run()
        self.assertEqual(ctx.exception.code, "VALIDATION")

        with tempfile.NamedTemporaryFile() as tmp_file:
            with self.assertRaises(AnzaError) as ctx:
                Setup(root=tmp_file.name).run()
            self.assertEqual(ctx.exception.code, "VALIDATION")

    def test_operation_validation_errors(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "layout").mkdir(parents=True, exist_ok=True)
            (root / "layout" / "shell.html").write_text("<main>{{content}}</main>", encoding="utf-8")
            engine = Setup(root=str(root)).run()

            with self.assertRaises(AnzaError) as ctx:
                Page(route="").run(engine)
            self.assertEqual(ctx.exception.code, "VALIDATION")

            with self.assertRaises(AnzaError) as ctx:
                Fragment(template="", slot="main").run(engine)
            self.assertEqual(ctx.exception.code, "VALIDATION")

            with self.assertRaises(AnzaError) as ctx:
                Fragment(template="card.html", slot="").run(engine)
            self.assertEqual(ctx.exception.code, "VALIDATION")

            with self.assertRaises(AnzaError) as ctx:
                Stream(template="", slot="main").run(engine)
            self.assertEqual(ctx.exception.code, "VALIDATION")

    def test_template_slot_parsing_syntax_errors(self):
        with self.assertRaises(AnzaError) as ctx:
            extract("<div>{{ unclosed slot")
        self.assertEqual(ctx.exception.code, "TEMPLATE")

        with self.assertRaises(AnzaError) as ctx:
            extract("<div>{{ }}</div>")
        self.assertEqual(ctx.exception.code, "TEMPLATE")

    def test_template_not_found(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "layout").mkdir(parents=True, exist_ok=True)
            (root / "layout" / "shell.html").write_text("<main>{{content}}</main>", encoding="utf-8")
            engine = Setup(root=str(root)).run()

            with self.assertRaises(AnzaError) as ctx:
                engine.get_template("non_existent.html")
            self.assertEqual(ctx.exception.code, "NOT_FOUND")

    def test_signing_missing_keys(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / "card.html").write_text("<div>{{title}}</div>", encoding="utf-8")

            # HMAC without secret
            engine_hmac = Setup(root=str(root), signing=SignOptions(mode="hmac", secret=None)).run()
            with self.assertRaises(AnzaError) as ctx:
                Fragment("card.html", "main", {"title": "Hello"}).run(engine_hmac)
            self.assertEqual(ctx.exception.code, "CRYPTO")

            # Ed25519 without private key
            engine_ed = Setup(root=str(root), signing=SignOptions(mode="ed25519", private_key=None)).run()
            with self.assertRaises(AnzaError) as ctx:
                Fragment("card.html", "main", {"title": "Hello"}).run(engine_ed)
            self.assertEqual(ctx.exception.code, "CRYPTO")

    def test_dataclass_and_object_binding(self):
        author = Author(name="Aduki Engineer", role="Architect")
        article = CustomArticle(title="Deep Dive into STUI", author=author)

        chunks = extract("<article><h1>{{title}}</h1></article>")
        res = string(chunks, article)
        self.assertEqual(res, "<article><h1>Deep Dive into STUI</h1></article>")

    def test_models_manifest_and_document(self):
        doc = Document(html="<html></html>")
        self.assertEqual(str(doc), "<html></html>")
        self.assertEqual(doc.to_bytes(), b"<html></html>")

        manifest = Manifest()
        manifest.insert("card.html", "hash123")
        self.assertEqual(manifest.get("card.html"), "hash123")
        self.assertIsNone(manifest.get("missing.html"))

        env = Envelope(slot="dock", ts=1000, html="<div/>", sig="s", css=".x{}")
        d = env.to_dict()
        self.assertEqual(d["css"], ".x{}")
        self.assertEqual(d["sig"], "s")


if __name__ == "__main__":
    unittest.main()
