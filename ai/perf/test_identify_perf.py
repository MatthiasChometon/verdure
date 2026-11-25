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

# Budgets come from the UX rules in docs/plans/refactor-socle.md ("Performance
# lot"), never from what the code does today (a warm identify is ~1 s on an
# RTX 3070 Ti, far under them). A red run means the code is too slow: fix the
# code, never raise a number.
#
# An identification is a background job: the app shows its progress state as soon
# as it takes more than 1 s (RAIL / Nielsen "flow of thought") and the user may
# leave. What is not acceptable is the 10 s attention limit (Nielsen): no single
# warm call may reach it. The ai-api only owns part of the whole path (photo
# upload, worker pick-up, result report, front polling), so its typical call gets
# half of that limit.
WARM_MEDIAN_BUDGET_S = 5.0
WARM_WORST_BUDGET_S = 10.0
# A search embeds the typed query before showing results: a navigation-level
# interaction, so the 1 s "flow of thought" budget.
EMBED_MEDIAN_BUDGET_S = 1.0
RUNS = 10


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

    last = benchmark.pedantic(timed_identify, rounds=RUNS, iterations=1, warmup_rounds=0)

    # Correctness sanity: it must still recognize the reference plant.
    assert last.get("species"), "identify returned no species"

    median = statistics.median(timings)
    assert median < WARM_MEDIAN_BUDGET_S, "warm identify median %.2fs exceeds %.1fs" % (
        median,
        WARM_MEDIAN_BUDGET_S,
    )
    assert max(timings) < WARM_WORST_BUDGET_S, "slowest warm identify %.2fs exceeds %.1fs" % (
        max(timings),
        WARM_WORST_BUDGET_S,
    )


def _embed(api, text):
    body = json.dumps({"text": text}).encode()
    request = urllib.request.Request(
        api + "/embed", data=body, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(request, timeout=400) as response:
        return json.loads(response.read())


def test_embed_warm_latency(api, ensure_warm):
    _embed(api, "monstera")  # untimed: loads the embedding model

    timings = []
    for _ in range(RUNS):
        start = time.perf_counter()
        result = _embed(api, "plante verte à grandes feuilles")
        timings.append(time.perf_counter() - start)
        assert result.get("embedding"), "embed returned no vector"

    median = statistics.median(timings)
    assert median < EMBED_MEDIAN_BUDGET_S, "warm embed median %.2fs exceeds %.1fs" % (
        median,
        EMBED_MEDIAN_BUDGET_S,
    )
