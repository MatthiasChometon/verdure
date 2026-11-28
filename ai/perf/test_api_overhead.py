"""What the ai-api itself adds around the model, measured against a fake ComfyUI.

No GPU, no stack: this runs anywhere (CI included) and fails when the api's own
plumbing (upload, submit, polling the history) makes an identification slower
than the model needs.

Budget, from the UX rules in docs/plans/refactor-socle.md ("Performance lot"):
an identification is a background operation, so its total belongs to the
attention limit (10 s, see test_identify_perf.py). The api's own share must stay
well inside the "interaction feels fluid" threshold (INP "good": 200 ms): the
user waits for the model, never for the plumbing around it.
"""

import base64
import importlib.util
import json
import pathlib
import statistics
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

API_OVERHEAD_BUDGET_S = 0.2
RUNS = 15
FAKE_MODEL_S = 0.35

AI = pathlib.Path(__file__).resolve().parent.parent


def _serve(handler):
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, "http://127.0.0.1:%d" % server.server_address[1]


def _fake_comfy_handler():
    """ComfyUI answering like the real one: a prompt is queued, then finishes
    FAKE_MODEL_S later with the species as its PreviewAny text."""
    finished_at = {}

    class FakeComfy(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def _send(self, body):
            payload = json.dumps(body).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self):
            if self.path.startswith("/history/"):
                pid = self.path.rsplit("/", 1)[1]
                if time.perf_counter() < finished_at.get(pid, 0):
                    return self._send({})
                outputs = {"3": {"text": ["Ficus lyrata"]}}
                return self._send({pid: {"status": {"status_str": "success"}, "outputs": outputs}})
            if self.path == "/queue":
                running = [[0, pid] for pid, at in finished_at.items() if time.perf_counter() < at]
                return self._send({"queue_running": running, "queue_pending": []})
            return self._send({})

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            self.rfile.read(length)
            if self.path == "/upload/image":
                return self._send({"name": "upload.jpg"})
            pid = "p%d" % len(finished_at)
            finished_at[pid] = time.perf_counter() + FAKE_MODEL_S
            return self._send({"prompt_id": pid})

    return FakeComfy


@pytest.fixture(scope="module")
def identify_url():
    comfy, comfy_url = _serve(_fake_comfy_handler())
    spec = importlib.util.spec_from_file_location("verdure_api", AI / "api" / "app.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.COMFY = comfy_url
    api, api_url = _serve(module.Handler)
    yield api_url + "/identify"
    api.shutdown()
    comfy.shutdown()


def _identify(url, body):
    request = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    start = time.perf_counter()
    with urllib.request.urlopen(request, timeout=30) as response:
        species = json.loads(response.read())["species"]
    return time.perf_counter() - start, species


def test_api_overhead_around_the_model_stays_under_budget(identify_url):
    image = (AI / "api" / "warmup.jpg").read_bytes()
    body = json.dumps({"image": base64.b64encode(image).decode()}).encode()
    _identify(identify_url, body)  # untimed: first connection

    timings = []
    for _ in range(RUNS):
        elapsed, species = _identify(identify_url, body)
        assert species == "Ficus lyrata"
        timings.append(elapsed)

    overhead = statistics.median(timings) - FAKE_MODEL_S
    assert overhead < API_OVERHEAD_BUDGET_S, (
        "the api adds %.0f ms around a %.0f ms model (median of %d runs), budget %.0f ms"
        % (overhead * 1000, FAKE_MODEL_S * 1000, RUNS, API_OVERHEAD_BUDGET_S * 1000)
    )
