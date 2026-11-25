"""The ai-api's own logic: polling a ComfyUI job and refusing bad input."""

import json
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

import pytest


class FakeClock:
    """time.sleep advances time.time, so a polling loop runs instantly."""

    def __init__(self):
        self.now = 1000.0

    def time(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


@pytest.fixture
def no_wait(api, monkeypatch):
    clock = FakeClock()
    monkeypatch.setattr(api, "time", clock)
    return clock


def history(status="success", outputs=None):
    return {"p": {"status": {"status_str": status}, "outputs": outputs or {}}}


def test_a_finished_job_returns_its_text(api, no_wait, monkeypatch):
    monkeypatch.setattr(api, "comfy_post", lambda _p, _w: {"prompt_id": "p"})
    monkeypatch.setattr(api, "comfy_get", lambda _p: history(outputs={"3": {"text": [" Ficus "]}}))

    assert api.submit_and_wait({}) == "Ficus"


def test_a_job_in_error_returns_none(api, no_wait, monkeypatch):
    monkeypatch.setattr(api, "comfy_post", lambda _p, _w: {"prompt_id": "p"})
    monkeypatch.setattr(api, "comfy_get", lambda _p: history(status="error"))

    assert api.submit_and_wait({}) is None


def test_a_prompt_dropped_by_a_comfy_restart_gives_up(api, no_wait, monkeypatch):
    monkeypatch.setattr(api, "comfy_post", lambda _p, _w: {"prompt_id": "p"})
    monkeypatch.setattr(api, "comfy_get", lambda path: {} if "history" in path else {"queue_running": []})

    assert api.submit_and_wait({}) is None


def test_the_queue_is_read_far_less_often_than_the_history(api, no_wait, monkeypatch):
    paths = []

    def comfy_get(path):
        paths.append(path)
        if "history" in path:
            return {} if no_wait.now < 1003 else history(outputs={"3": {"text": "ok"}})
        return {"queue_running": [[0, "p"]]}

    monkeypatch.setattr(api, "comfy_post", lambda _p, _w: {"prompt_id": "p"})
    monkeypatch.setattr(api, "comfy_get", comfy_get)

    assert api.submit_and_wait({}) == "ok"
    assert sum("history" in path for path in paths) >= 30
    assert sum(path == "/queue" for path in paths) <= 4


def test_an_outage_is_logged_once_not_per_poll(api, no_wait, monkeypatch, capsys):
    def comfy_get(_path):
        raise RuntimeError("down")

    monkeypatch.setattr(api, "comfy_post", lambda _p, _w: {"prompt_id": "p"})
    monkeypatch.setattr(api, "comfy_get", comfy_get)

    assert api.submit_and_wait({}, max_wait_s=30) is None
    assert capsys.readouterr().out.count("history poll failed") == 1


def test_a_failing_poll_is_logged_and_retried(api, no_wait, monkeypatch, capsys):
    answers = iter([RuntimeError("down"), history(outputs={"3": {"text": "ok"}})])

    def comfy_get(_path):
        answer = next(answers)
        if isinstance(answer, Exception):
            raise answer
        return answer

    monkeypatch.setattr(api, "comfy_post", lambda _p, _w: {"prompt_id": "p"})
    monkeypatch.setattr(api, "comfy_get", comfy_get)

    assert api.submit_and_wait({}) == "ok"
    assert "history poll failed (down)" in capsys.readouterr().out


def test_a_failed_attempt_is_logged_not_swallowed(api, no_wait, monkeypatch, capsys):
    monkeypatch.setattr(api, "wait_comfy", lambda: True)

    def broken(_wf, max_wait_s):
        raise RuntimeError("comfy exploded")

    monkeypatch.setattr(api, "submit_and_wait", broken)

    assert api.submit_resilient(lambda: {}) is None
    assert capsys.readouterr().out.count("comfy exploded") == 2


@pytest.fixture
def server(api):
    http = ThreadingHTTPServer(("127.0.0.1", 0), api.Handler)
    threading.Thread(target=http.serve_forever, daemon=True).start()
    yield "http://127.0.0.1:%d" % http.server_address[1]
    http.shutdown()


def post(url, body, headers=None):
    data = body if isinstance(body, bytes) else json.dumps(body).encode()
    request = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json", **(headers or {})}
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


@pytest.mark.parametrize(
    "path, body",
    [
        ("/identify", b"not json"),
        ("/identify", b"[1]"),
        ("/identify", {}),
        ("/identify", {"image": "!!! not base64 !!!"}),
        ("/identify", {"image": 42}),
        ("/diagnose", {"image": ""}),
        ("/embed", {}),
        ("/embed", {"text": 42}),
    ],
)
def test_bad_input_is_refused_before_touching_comfy(server, path, body):
    assert post(server + path, body) == 400


def raw_post(server, headers, body=b""):
    import http.client

    connection = http.client.HTTPConnection(server.removeprefix("http://"), timeout=3)
    connection.putrequest("POST", "/identify")
    for name, value in headers.items():
        connection.putheader(name, value)
    connection.endheaders(body)
    try:
        return connection.getresponse().status
    finally:
        connection.close()


def test_a_negative_content_length_is_refused_not_awaited(server):
    assert raw_post(server, {"Content-Length": "-1"}) == 400


def test_a_missing_content_length_is_refused(server):
    assert raw_post(server, {}) == 400


def test_an_oversized_body_is_refused_before_reading_it(server, api):
    assert raw_post(server, {"Content-Length": str(api.MAX_BODY_BYTES + 1)}) == 413
