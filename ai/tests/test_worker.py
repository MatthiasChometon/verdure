"""Behaviour of the worker loop against a faked back and a faked ai-api."""

import io
import urllib.error

import pytest


def http_error(code):
    return urllib.error.HTTPError("http://back", code, "x", {}, io.BytesIO(b""))


class Calls(list):
    """Every request the worker made, plus the scripted failures per URL suffix."""

    def __init__(self):
        super().__init__()
        self.failures = {}


@pytest.fixture
def calls(worker, monkeypatch):
    recorded = Calls()
    failures = recorded.failures

    def fake_request(method, url, body=None, headers=None, timeout=30):
        recorded.append((method, url, body, timeout))
        for suffix, errors in failures.items():
            if url.endswith(suffix) and errors:
                raise errors.pop(0)
        if url.endswith("/identify"):
            return {"species": "Ficus lyrata"}
        return {}

    monkeypatch.setattr(worker, "request", fake_request)
    monkeypatch.setattr(worker, "BACK", "http://back")
    monkeypatch.setattr(worker, "AI_API", "http://ai")
    monkeypatch.setattr(worker.time, "sleep", lambda _s: None)
    return recorded


def urls(calls):
    return [url for _method, url, _body, _timeout in calls]


def test_a_result_report_survives_a_transient_back_error(worker, calls):
    calls.failures["/result"] = [http_error(503), urllib_timeout()]

    worker.process({"jobId": "j1", "kind": "identify", "image": "abc"})

    assert urls(calls).count("http://back/worker/jobs/j1/result") == 3


def urllib_timeout():
    return TimeoutError("timed out")


def test_a_result_report_gives_up_after_the_attempt_cap_without_raising(worker, calls):
    calls.failures["/result"] = [http_error(503)] * 10

    worker.process({"jobId": "j1", "kind": "identify", "image": "abc"})

    assert urls(calls).count("http://back/worker/jobs/j1/result") == worker.REPORT_ATTEMPTS


def test_a_refused_report_is_not_retried(worker, calls):
    calls.failures["/result"] = [http_error(404)]

    worker.process({"jobId": "j1", "kind": "identify", "image": "abc"})

    assert urls(calls).count("http://back/worker/jobs/j1/result") == 1


@pytest.mark.parametrize(
    "job, report",
    [
        ({"jobId": "j", "kind": "identify", "image": "a"}, "/result"),
        ({"jobId": "j", "kind": "embed", "text": "t"}, "/embedding"),
        ({"jobId": "j", "kind": "diagnose", "image": "a"}, "/diagnosis"),
    ],
)
def test_every_kind_reports_through_the_retrying_path(worker, calls, monkeypatch, job, report):
    monkeypatch.setattr(worker, "embed", lambda _t: [0.1])
    monkeypatch.setattr(worker, "diagnose", lambda _i: "dry leaves")
    calls.failures[report] = [http_error(502)]

    worker.process(job)

    assert urls(calls).count("http://back/worker/jobs/j" + report) == 2


def test_a_malformed_job_is_reported_failed_not_a_crash(worker, calls):
    worker.process({"jobId": "j1", "kind": "identify"})

    assert urls(calls) == ["http://back/worker/jobs/j1/failed"]


def test_the_loop_survives_a_job_that_raises(worker, monkeypatch):
    jobs = iter([{"jobId": "j1"}, None])
    processed = []

    def next_job():
        try:
            return next(jobs)
        except StopIteration:
            raise KeyboardInterrupt

    def process(job):
        processed.append(job)
        raise RuntimeError("boom")

    monkeypatch.setattr(worker, "load_token", lambda: "vwk_x")
    monkeypatch.setattr(worker, "next_job", next_job)
    monkeypatch.setattr(worker, "process", process)
    monkeypatch.setattr(worker.time, "sleep", lambda _s: None)

    with pytest.raises(KeyboardInterrupt):
        worker.main()

    assert processed == [{"jobId": "j1"}]


def test_the_paired_token_is_saved_private(worker, monkeypatch, tmp_path):
    monkeypatch.setattr(worker, "TOKEN_FILE", tmp_path / "dir" / "worker-token")

    worker.save_token("vwk_secret")

    saved = worker.TOKEN_FILE
    assert saved.read_text(encoding="utf-8") == "vwk_secret"
    assert list(saved.parent.glob("*.tmp")) == []
    if worker.os.name == "posix":
        assert saved.stat().st_mode & 0o777 == 0o600


def test_every_external_call_carries_a_timeout(worker):
    import inspect

    assert inspect.signature(worker.request).parameters["timeout"].default == 30
