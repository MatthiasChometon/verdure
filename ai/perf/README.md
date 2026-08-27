# Performance tests — plant identification

Measures the **warm latency** of the local identification endpoint
(`POST /identify` on the ai-api) with [pytest-benchmark](https://pytest-benchmark.readthedocs.io).

The test hits a **live, warmed** ai-api. If the service is down or the vision
model isn't loaded yet, the test **skips** (a perf number off a cold service is
meaningless) rather than failing.

## Run

```bash
# 1) install dev deps (kept out of the stdlib-only runtime)
pip install -r ai/requirements-dev.txt

# 2) start the AI stack and wait until http://127.0.0.1:8000/health shows
#    "warmed": true  (launch "verdure IA", or `python api/app.py` with a
#    running ComfyUI on COMFY_URL)

# 3) run it
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
