"""Warm-latency performance test for POST /identify, via pytest-benchmark.

pytest-benchmark runs the call over many rounds and reports
min / mean / median / stddev / ops. Beyond the one-shot report it supports
saving a baseline and failing a run when latency regresses — the professional
way to gate perf in CI:

    # one time: install the dev deps
    pip install -r ai/requirements-dev.txt

    # start the stack (verdure IA / tray.py) and wait for /health warmed:true, then
    pytest ai/perf -v

    # save a baseline, then fail later runs on a >25% median regression
    pytest ai/perf --benchmark-autosave
    pytest ai/perf --benchmark-compare --benchmark-compare-fail=median:25%
"""

import json
import statistics
import time
import urllib.request

# Coarse absolute ceiling. A warm identify is ~1s on a GPU box; 8s catches a real
# regression (e.g. the vision model silently fell back to CPU) without flaking on
# an unlucky slow round. Machine-specific regressions are better caught with
# --benchmark-compare against a saved baseline.
WARM_CEILING_S = 8.0


def _identify(api, image_b64):
    body = json.dumps({"image": image_b64}).encode()
    request = urllib.request.Request(
        api + "/identify", data=body, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(request, timeout=400) as response:
        return json.loads(response.read())


def test_identify_warm_latency(benchmark, api, warm_image, ensure_warm):
    # Two untimed calls so the slightly slower first-after-warm call is excluded
    # from the measured window.
    for _ in range(2):
        _identify(api, warm_image)

    # Record our own per-round timings alongside pytest-benchmark so the
    # assertion does not depend on the library's internal stats layout.
    timings = []

    def timed_identify():
        start = time.perf_counter()
        result = _identify(api, warm_image)
        timings.append(time.perf_counter() - start)
        return result

    last = benchmark.pedantic(timed_identify, rounds=10, iterations=1, warmup_rounds=0)

    # Correctness sanity: it must still recognize the reference plant.
    assert last.get("species"), "identify returned no species"

    median = statistics.median(timings)
    assert median < WARM_CEILING_S, "warm identify median %.2fs exceeds %.1fs ceiling" % (
        median,
        WARM_CEILING_S,
    )
