"""verdure AI worker — bring-your-own-GPU.

Connects a local ComfyUI (through the ai-api) to the hosted verdure back. It
long-polls the back for plant-recognition jobs, runs identification locally on
the GPU and posts the species back. Only OUTBOUND connections — nothing to
expose, no ports, no certificate.

Authentication is hands-free: on first run the worker opens a pairing screen in
the browser, the signed-in user approves it, and the worker receives and stores
its token. No token to copy or paste. A token can still be injected directly
with VERDURE_WORKER_TOKEN (e.g. for tests or headless setups).

Env:
  VERDURE_BACK_URL     base URL of the hosted back (e.g. https://verdure.example)
  AI_API_URL           local ai-api (default http://ai-api:8000)
  VERDURE_WORKER_TOKEN optional pre-set `vwk_...` token (skips pairing)
  VERDURE_TOKEN_FILE   where the paired token is stored (default /data/worker-token)
"""

import json
import os
import socket
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

# Defaults make the bare script runnable natively (no Docker, no config): it
# points at the hosted back and a ComfyUI/ai-api running locally, and keeps the
# paired token in the user's home. Env vars still override (the Docker overlay
# sets AI_API_URL and the token path to its container network/volume).
BACK = os.environ.get("VERDURE_BACK_URL", "https://api.verdure.mtxlab.xyz").rstrip("/")
AI_API = os.environ.get("AI_API_URL", "http://localhost:8000").rstrip("/")
TOKEN_FILE = Path(
    os.environ.get("VERDURE_TOKEN_FILE", str(Path.home() / ".verdure" / "worker-token"))
)

# Give the long-poll a little more than the server's hold window.
NEXT_JOB_TIMEOUT_S = 40
# ai-api may cold-start ComfyUI and load the vision model on the first job.
IDENTIFY_TIMEOUT_S = 400
# The embedding model is small but ComfyUI may still cold-start on the first one.
EMBED_TIMEOUT_S = 120
ERROR_BACKOFF_S = 10
EMPTY_BACKOFF_S = 1
PAIR_POLL_INTERVAL_S = 5

TOKEN = None


def request(method, url, body=None, headers=None, timeout=30):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    if data is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=timeout) as response:
        raw = response.read()
        return json.loads(raw) if raw else {}


def auth_headers():
    return {"Authorization": "Bearer %s" % TOKEN}


# --- Pairing -----------------------------------------------------------------


def load_token():
    """The token from the env, or the one saved by a previous pairing."""
    from_env = os.environ.get("VERDURE_WORKER_TOKEN")
    if from_env:
        return from_env
    if TOKEN_FILE.exists():
        saved = TOKEN_FILE.read_text(encoding="utf-8").strip()
        if saved:
            return saved
    return None


def save_token(token):
    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    TOKEN_FILE.write_text(token, encoding="utf-8")


def pair():
    """Open a pairing, wait for the user to approve it, return the token."""
    while True:
        started = request(
            "POST",
            "%s/worker/pair/start" % BACK,
            body={"label": socket.gethostname()},
        )
        code = started["code"]
        secret = started["secret"]
        verify_url = started["verifyUrl"]

        print("\n" + "=" * 52)
        print("  Connect this device to verdure")
        print("  1. Open: %s" % verify_url)
        print("  2. Confirm the code: %s" % code)
        print("=" * 52 + "\n", flush=True)
        try:
            webbrowser.open(verify_url)
        except Exception:
            pass

        token = wait_for_approval(secret)
        if token is not None:
            save_token(token)
            print("verdure-worker: paired — this device is now connected.")
            return token
        print("verdure-worker: pairing expired, starting a new one…")


def wait_for_approval(secret):
    """Poll until approved (returns the token), denied or expired (returns None)."""
    while True:
        try:
            result = request(
                "POST", "%s/worker/pair/poll" % BACK, body={"secret": secret}
            )
        except Exception as error:
            print("verdure-worker: back unreachable while pairing (%s)" % error)
            time.sleep(ERROR_BACKOFF_S)
            continue

        status = result.get("status")
        if status == "approved":
            return result.get("token")
        if status in ("expired", "denied"):
            if status == "denied":
                print("verdure-worker: pairing was denied.")
            return None
        time.sleep(PAIR_POLL_INTERVAL_S)


# --- Job loop ----------------------------------------------------------------


def next_job():
    """Long-poll the back; returns a job dict or None when there is no work."""
    body = request(
        "GET",
        "%s/worker/next-job" % BACK,
        headers=auth_headers(),
        timeout=NEXT_JOB_TIMEOUT_S,
    )
    return body if body.get("jobId") else None


def identify(image_b64):
    """Delegate to the local ai-api, which starts ComfyUI on demand."""
    body = request(
        "POST",
        "%s/identify" % AI_API,
        body={"image": image_b64},
        timeout=IDENTIFY_TIMEOUT_S,
    )
    return body.get("species")


def embed(text):
    """Delegate to the local ai-api's embedding pipeline (nomic, 768-d)."""
    body = request(
        "POST",
        "%s/embed" % AI_API,
        body={"text": text},
        timeout=EMBED_TIMEOUT_S,
    )
    return body.get("embedding")


def report_result(job_id, species):
    request(
        "POST",
        "%s/worker/jobs/%s/result" % (BACK, job_id),
        body={"species": species},
        headers=auth_headers(),
    )


def report_embedding(job_id, vector):
    request(
        "POST",
        "%s/worker/jobs/%s/embedding" % (BACK, job_id),
        body={"embedding": vector},
        headers=auth_headers(),
    )


def report_failure(job_id):
    request(
        "POST",
        "%s/worker/jobs/%s/failed" % (BACK, job_id),
        headers=auth_headers(),
    )


def report_failure_safely(job_id):
    """Report a job failure, swallowing a failed report — the loop goes on."""
    try:
        report_failure(job_id)
    except Exception as error:
        print("verdure-worker: could not report failure (%s)" % error)


def process(job):
    """Run a job by its kind: identify a photo, or embed a text for search."""
    job_id = job["jobId"]
    kind = job.get("kind", "identify")
    print("verdure-worker: job %s (%s) received" % (job_id, kind))
    if kind == "embed":
        process_embed(job_id, job.get("text", ""))
    else:
        process_identify(job_id, job["image"])


def process_identify(job_id, image_b64):
    try:
        species = identify(image_b64)
    except Exception as error:
        print("verdure-worker: identify failed for %s (%s)" % (job_id, error))
        report_failure_safely(job_id)
        return
    report_result(job_id, species)
    print("verdure-worker: job %s -> %r" % (job_id, species))


def process_embed(job_id, text):
    try:
        vector = embed(text)
    except Exception as error:
        print("verdure-worker: embed failed for %s (%s)" % (job_id, error))
        report_failure_safely(job_id)
        return
    if not vector:
        print("verdure-worker: embed returned nothing for %s" % job_id)
        report_failure_safely(job_id)
        return
    report_embedding(job_id, vector)
    print("verdure-worker: job %s -> embedding[%d]" % (job_id, len(vector)))


def main():
    global TOKEN
    TOKEN = load_token()
    if TOKEN is None:
        TOKEN = pair()

    print("verdure-worker: connected to %s (ai: %s)" % (BACK, AI_API))
    while True:
        try:
            job = next_job()
        except urllib.error.HTTPError as error:
            if error.code == 401:
                # The token was revoked in the app; drop it and pair afresh.
                print("verdure-worker: token rejected (401) — re-pairing…")
                try:
                    TOKEN_FILE.unlink()
                except FileNotFoundError:
                    pass
                TOKEN = pair()
            else:
                print("verdure-worker: back error %s" % error.code)
                time.sleep(ERROR_BACKOFF_S)
            continue
        except Exception as error:
            print("verdure-worker: back unreachable (%s)" % error)
            time.sleep(ERROR_BACKOFF_S)
            continue

        if job is None:
            # Empty long-poll (no work); brief pause, then reconnect (which also
            # keeps this worker marked online).
            time.sleep(EMPTY_BACKOFF_S)
            continue
        process(job)


if __name__ == "__main__":
    main()
