"""verdure AI worker — bring-your-own-GPU.

Connects a local ComfyUI (through the ai-api) to the hosted verdure back. It
authenticates with a per-user worker token, long-polls the back for plant-
recognition jobs, runs identification locally on the GPU and posts the species
back. Only OUTBOUND connections — nothing to expose, no ports, no certificate.

Env:
  VERDURE_BACK_URL     base URL of the hosted back (e.g. https://verdure.example)
  VERDURE_WORKER_TOKEN the `vwk_...` token from the app's "Activate AI" screen
  AI_API_URL           local ai-api (default http://ai-api:8000)
"""

import json
import os
import time
import urllib.error
import urllib.request

BACK = os.environ["VERDURE_BACK_URL"].rstrip("/")
TOKEN = os.environ["VERDURE_WORKER_TOKEN"]
AI_API = os.environ.get("AI_API_URL", "http://ai-api:8000").rstrip("/")

# Give the long-poll a little more than the server's hold window.
NEXT_JOB_TIMEOUT_S = 40
# ai-api may cold-start ComfyUI and load the vision model on the first job.
IDENTIFY_TIMEOUT_S = 400
ERROR_BACKOFF_S = 10
EMPTY_BACKOFF_S = 1


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


def report_result(job_id, species):
    request(
        "POST",
        "%s/worker/jobs/%s/result" % (BACK, job_id),
        body={"species": species},
        headers=auth_headers(),
    )


def report_failure(job_id):
    request(
        "POST",
        "%s/worker/jobs/%s/failed" % (BACK, job_id),
        headers=auth_headers(),
    )


def process(job):
    job_id = job["jobId"]
    print("verdure-worker: job %s received" % job_id)
    try:
        species = identify(job["image"])
    except Exception as error:
        print("verdure-worker: identify failed for %s (%s)" % (job_id, error))
        try:
            report_failure(job_id)
        except Exception as report_error:
            print("verdure-worker: could not report failure (%s)" % report_error)
        return
    report_result(job_id, species)
    print("verdure-worker: job %s -> %r" % (job_id, species))


def main():
    print("verdure-worker: connected to %s (ai: %s)" % (BACK, AI_API))
    while True:
        try:
            job = next_job()
        except urllib.error.HTTPError as error:
            if error.code == 401:
                print("verdure-worker: token rejected (401) — check the token")
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
