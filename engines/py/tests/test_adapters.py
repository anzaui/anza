import unittest
import json
import asyncio
from anza import Document, Envelope
from anza.adapters import asgi, wsgi, fastapi, flask


class TestAnzaAdapters(unittest.TestCase):
    def test_asgi_send_html(self):
        doc = Document(html="<h1>ASGI Home</h1>")
        messages = []

        async def mock_send(msg):
            messages.append(msg)

        asyncio.run(asgi.send_html(mock_send, doc, status=200))

        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0]["type"], "http.response.start")
        self.assertEqual(messages[0]["status"], 200)
        self.assertEqual(messages[1]["type"], "http.response.body")
        self.assertEqual(messages[1]["body"], b"<h1>ASGI Home</h1>")

    def test_asgi_send_json(self):
        env = Envelope(slot="feed", ts=1724771200, html="<div>Card</div>", sig="sig123")
        messages = []

        async def mock_send(msg):
            messages.append(msg)

        asyncio.run(asgi.send_json(mock_send, env, status=200))

        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0]["type"], "http.response.start")
        self.assertEqual(messages[1]["type"], "http.response.body")
        body_dict = json.loads(messages[1]["body"].decode("utf-8"))
        self.assertEqual(body_dict["slot"], "feed")
        self.assertEqual(body_dict["sig"], "sig123")

    def test_wsgi_send_html(self):
        doc = Document(html="<h1>WSGI Home</h1>")
        captured_status = []
        captured_headers = []

        def mock_start_response(status, headers):
            captured_status.append(status)
            captured_headers.extend(headers)

        body = wsgi.send_html(mock_start_response, doc, status="200 OK")
        self.assertEqual(captured_status[0], "200 OK")
        self.assertEqual(body, [b"<h1>WSGI Home</h1>"])

    def test_wsgi_send_json(self):
        env = Envelope(slot="feed", ts=1724771200, html="<div>Card</div>", sig="sig123")
        captured_status = []
        captured_headers = []

        def mock_start_response(status, headers):
            captured_status.append(status)
            captured_headers.extend(headers)

        body = wsgi.send_json(mock_start_response, env, status="200 OK")
        self.assertEqual(captured_status[0], "200 OK")
        body_dict = json.loads(body[0].decode("utf-8"))
        self.assertEqual(body_dict["slot"], "feed")

    def test_fastapi_and_flask_helpers_fallback(self):
        doc = Document(html="<p>Test</p>")
        env = Envelope(slot="main", ts=1724771200, html="<p>Test</p>")

        # Fallback or framework response
        res_html = fastapi.html_response(doc)
        self.assertTrue(hasattr(res_html, "body") or res_html == "<p>Test</p>")

        res_json = fastapi.json_response(env)
        self.assertTrue(hasattr(res_json, "body") or isinstance(res_json, dict))

        f_html = flask.html_response(doc)
        self.assertTrue(hasattr(f_html, "data") or f_html == "<p>Test</p>")

        f_json = flask.json_response(env)
        self.assertTrue(hasattr(f_json, "json") or isinstance(f_json, dict))


if __name__ == "__main__":
    unittest.main()
