"""Fixtures for the identification performance tests.

The suite measures the WARM latency of a live ai-api, so it needs the stack
(verdure IA / `python api/app.py` + a running ComfyUI) to be up and the vision
model already loaded. When that is not the case the tests skip with an
explanation instead of failing — a perf number off a cold or absent service
would be meaningless.
"""

import base64
import json
import os
import time
import urllib.error
import urllib.request

import pytest

API = os.environ.get("AI_API_URL", "http://127.0.0.1:8000").rstrip("/")
WARMUP_JPG = os.path.join(os.path.dirname(__file__), "..", "api", "warmup.jpg")


def _get_json(url, timeout=4):
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return json.loads(response.read())


@pytest.fixture(scope="session")
def api():
    return API


@pytest.fixture(scope="session")
def warm_image():
    """The reference plant image, base64-encoded, as the /identify body expects."""
    with open(WARMUP_JPG, "rb") as f:
        return base64.b64encode(f.read()).decode()


@pytest.fixture(scope="session")
def ensure_warm(api):
    """Skip the suite unless a live ai-api is up AND the model is warmed."""
    health = api + "/health"
    try:
        report = _get_json(health)
    except (urllib.error.URLError, OSError):
        pytest.skip(
            "ai-api not reachable at %s — start the stack (verdure IA, or "
            "`python api/app.py` with a running ComfyUI) first." % api
        )

    # Let a just-started stack finish its startup warmup before giving up.
    deadline = time.time() + 90
    while not report.get("warmed") and time.time() < deadline:
        time.sleep(3)
        try:
            report = _get_json(health)
        except (urllib.error.URLError, OSError):
            break

    if not report.get("warmed"):
        pytest.skip("ai-api is up but not warmed yet — retry once /health shows warmed:true.")
    return report
