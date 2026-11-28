# Performance tests — plant identification

Two suites, both **fail when too slow** (median of at least 10 runs):

| test | needs | budget | why |
| --- | --- | --- | --- |
| `test_api_overhead.py` | nothing (fake ComfyUI) | api adds < 200 ms around the model | INP "good" 200 ms: the user waits for the model, not the plumbing |
| `test_identify_perf.py` identify | live GPU stack | median < 5 s, slowest < 10 s | background job with a progress state past 1 s; 10 s is the attention limit, the api owns half of the path |
| `test_identify_perf.py` embed | live GPU stack | median < 1 s | typed search: 1 s flow-of-thought |

Budgets come from the UX rules of `docs/plans/refactor-socle.md` ("Performance
lot"). A red run is a bug to fix, never a number to raise.

Measures the **warm latency** of the local identification endpoint
(`POST /identify` on the ai-api) with [pytest-benchmark](https://pytest-benchmark.readthedocs.io).

The live tests hit a **live, warmed** ai-api. If the service is down or the vision
model isn't loaded yet, the test **skips** (a perf number off a cold service is
meaningless) rather than failing.

## Run

```bash
# 1) install dev deps (kept out of the stdlib-only runtime)
pip install -r ai/requirements-dev.txt

# 2) start the AI stack and wait until http://127.0.0.1:8000/health shows
#    "warmed": true  (launch "verdure IA", or `python api/app.py` with a
#    running ComfyUI on COMFY_URL)

# 3) run it (test_api_overhead.py runs without the stack)
pytest ai/perf -v
```

Point at a non-default api with `AI_API_URL` (e.g. `AI_API_URL=http://127.0.0.1:8000`).

## Regression gating (CI-style)

```bash
# save the current numbers as the baseline
pytest ai/perf --benchmark-autosave

# later: fail the run if the median got >25% slower than the baseline
pytest ai/perf --benchmark-compare --benchmark-compare-fail=median:25%
```

## Reading the output

pytest-benchmark prints a table with `Min / Max / Mean / StdDev / Median / IQR /
OPS / Rounds`. The number that matters here is **Median** (typical warm call).
On an RTX 3070 Ti it lands around **~1.1 s**; the actual GPU inference runs via
CUDA-built `llama.cpp` even though ComfyUI itself is started with `--cpu` (that
only keeps ComfyUI's torch off the GPU to save VRAM).
