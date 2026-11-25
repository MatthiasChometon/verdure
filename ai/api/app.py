"""Small HTTP wrapper (Python standard library only) that fronts the ComfyUI
pipelines for the verdure back. It injects the request into an API-format
workflow, submits it to ComfyUI and reads the graph output back.

Endpoints
  GET  /health   -> {"status":"ok","comfy_up":bool}
  POST /identify body {"image":"<base64 JPEG>"} -> {"species":"Genus species"|null}
  POST /diagnose body {"image":"<base64 JPEG>"} -> {"diagnosis":"<free text>"|null}
  POST /embed    body {"text":"..."}            -> {"embedding":[...]|null}
"""

import base64
import binascii
import http.client
import json
import os
import random
import socket
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

COMFY = os.environ.get("COMFY_URL", "http://comfyui:8188").rstrip("/")
HOST, PORT = "0.0.0.0", 8000
HERE = os.path.dirname(os.path.abspath(__file__))
WORKFLOWS = os.path.join(HERE, "workflows")

# On-demand mode: when COMFY_CONTAINER is set, ai-api starts the (initially
# stopped) ComfyUI container itself on the first identify/embed and stops it
# again after AI_IDLE_TIMEOUT_S with no traffic, so its VRAM/RAM is only spent
# while actually in use. When unset (dev / always-on deploys), ComfyUI is
# expected to be already running and we keep the old warm-at-startup behaviour.
COMFY_CONTAINER = os.environ.get("COMFY_CONTAINER", "").strip()
IDLE_TIMEOUT_S = int(os.environ.get("AI_IDLE_TIMEOUT_S", "900"))
DOCKER_SOCK = os.environ.get("DOCKER_SOCK", "/var/run/docker.sock")

# Every call to ComfyUI is capped; a model run is polled, not awaited in one call.
COMFY_CALL_TIMEOUT_S = 30
HISTORY_POLL_S = 0.1
# The (whole) queue is only read this often, to tell a queued prompt from one a
# ComfyUI restart dropped: a prompt in neither state for LOST_AFTER_S is dropped.
QUEUE_CHECK_S = 1.0
LOST_AFTER_S = 8.0
# A request body is a base64 photo (a few MB) or a short text.
MAX_BODY_BYTES = 25 * 1024 * 1024


def comfy_post(path, payload):
    req = urllib.request.Request(
        COMFY + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=COMFY_CALL_TIMEOUT_S) as r:
        return json.loads(r.read())


def comfy_get(path):
    with urllib.request.urlopen(COMFY + path, timeout=COMFY_CALL_TIMEOUT_S) as r:
        return json.loads(r.read())


def comfy_up():
    try:
        urllib.request.urlopen(COMFY + "/", timeout=3)
        return True
    except Exception:
        return False


class _UnixHTTPConnection(http.client.HTTPConnection):
    """Talk HTTP to the Docker Engine over its Unix socket — stdlib only, no
    docker CLI or SDK in the image."""

    def __init__(self, sock_path):
        super().__init__("localhost", timeout=10)
        self._sock_path = sock_path

    def connect(self):
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.settimeout(10)
        s.connect(self._sock_path)
        self.sock = s


def _docker(method, path):
    conn = _UnixHTTPConnection(DOCKER_SOCK)
    try:
        conn.request(method, path)
        resp = conn.getresponse()
        return resp.status, resp.read()
    finally:
        conn.close()


def comfy_container_running():
    try:
        status, body = _docker("GET", "/containers/%s/json" % COMFY_CONTAINER)
        return status == 200 and bool(json.loads(body).get("State", {}).get("Running"))
    except Exception:
        return False


def start_comfy_container():
    # 204 = started, 304 = already running; both are fine.
    try:
        _docker("POST", "/containers/%s/start" % COMFY_CONTAINER)
        return True
    except Exception as e:
        print("verdure-ai: could not start %s (%s)" % (COMFY_CONTAINER, e))
        return False


def stop_comfy_container():
    try:
        _docker("POST", "/containers/%s/stop" % COMFY_CONTAINER)
        print("verdure-ai: stopped %s (idle)" % COMFY_CONTAINER)
    except Exception as e:
        print("verdure-ai: could not stop %s (%s)" % (COMFY_CONTAINER, e))


# Lifecycle state for on-demand mode.
_lc_lock = threading.Lock()
_last_used = time.time()
_active = 0

# True once the startup warmup has loaded the vision model (always-on/native
# mode). Exposed on /health so the native launcher can show a "model warmed"
# step and users know the first real scan will be fast.
_warmed = False


def ensure_comfy_ready():
    """Make sure ComfyUI can serve a request. In on-demand mode this starts the
    container (once, guarded) and waits for it to answer; otherwise it just
    checks health. Returns True when ComfyUI is reachable."""
    if not COMFY_CONTAINER:
        return comfy_up()
    if comfy_up():
        return True
    with _lc_lock:
        if not comfy_up() and not comfy_container_running():
            print("verdure-ai: starting %s on demand" % COMFY_CONTAINER)
            start_comfy_container()
    return wait_comfy(cap_s=150)


def _begin():
    global _active, _last_used
    with _lc_lock:
        _active += 1
        # Refresh the idle clock on arrival so the reaper can't stop ComfyUI
        # while this very request is still booting/waiting for it.
        _last_used = time.time()


def _end():
    global _active, _last_used
    with _lc_lock:
        _active -= 1
        _last_used = time.time()


def idle_reaper():
    """Stop ComfyUI once it has been idle long enough, to release VRAM/RAM."""
    while True:
        time.sleep(60)
        with _lc_lock:
            idle = time.time() - _last_used
            busy = _active > 0
        if not busy and idle > IDLE_TIMEOUT_S and comfy_container_running():
            stop_comfy_container()


def load_workflow(name):
    with open(os.path.join(WORKFLOWS, name), encoding="utf-8") as f:
        return json.load(f)


def upload_image(image_bytes):
    """Upload raw JPEG bytes to ComfyUI's input folder, return its name."""
    boundary = "----verdure%d" % random.randint(1, 2**31 - 1)
    head = (
        "--%s\r\n"
        'Content-Disposition: form-data; name="image"; filename="upload.jpg"\r\n'
        "Content-Type: image/jpeg\r\n\r\n" % boundary
    ).encode("utf-8")
    body = head + image_bytes + ("\r\n--%s--\r\n" % boundary).encode("utf-8")
    req = urllib.request.Request(
        COMFY + "/upload/image",
        data=body,
        headers={"Content-Type": "multipart/form-data; boundary=%s" % boundary},
    )
    with urllib.request.urlopen(req, timeout=COMFY_CALL_TIMEOUT_S) as r:
        return json.loads(r.read())["name"]


def history_text(entry):
    """The PreviewAny text output of a finished history entry."""
    for node_out in entry.get("outputs", {}).values():
        txt = node_out.get("text")
        if txt:
            return (txt[0] if isinstance(txt, list) else txt).strip()
    return None


def prompt_queued(pid):
    try:
        q = comfy_get("/queue")
    except Exception:
        return True
    for key in ("queue_running", "queue_pending"):
        for item in q.get(key, []):
            if len(item) > 1 and item[1] == pid:
                return True
    return False


def submit_and_wait(wf, max_wait_s=240):
    """POST a workflow and block until our job finishes (ComfyUI has a single
    queue), returning the PreviewAny text or None on error/timeout. The history
    is polled every HISTORY_POLL_S, so the wait adds at most that on top of the
    model's own time."""
    pid = comfy_post("/prompt", wf).get("prompt_id")
    if not pid:
        return None
    deadline = time.time() + max_wait_s
    next_queue_check = 0.0
    lost_since = None
    polling_failed = False
    while time.time() < deadline:
        try:
            entry = comfy_get("/history/" + pid).get(pid)
        except Exception as error:
            if not polling_failed:  # one line per outage, not one per poll
                print("verdure-ai: history poll failed (%s)" % error)
            polling_failed = True
        else:
            polling_failed = False
            if entry and entry.get("status", {}).get("status_str") == "error":
                return None
            if entry and entry.get("outputs"):
                return history_text(entry)
            if entry:
                lost_since = None
            elif time.time() >= next_queue_check:
                next_queue_check = time.time() + QUEUE_CHECK_S
                lost_since = None if prompt_queued(pid) else (lost_since or time.time())
            if lost_since is not None and time.time() - lost_since > LOST_AFTER_S:
                return None
        time.sleep(HISTORY_POLL_S)
    return None


def wait_comfy(cap_s=90):
    """Block until ComfyUI answers again (it can restart under VRAM pressure on
    small GPUs while loading the vision model)."""
    deadline = time.time() + cap_s
    while time.time() < deadline:
        if comfy_up():
            return True
        time.sleep(2)
    return False


def submit_resilient(build_wf, attempts=2):
    """Run a workflow, re-submitting if ComfyUI dropped it (a restart clears the
    queue and the uploaded input), so a transient crash is retried transparently.
    `build_wf` is called fresh each attempt (it re-uploads any input). Returns
    the raw output text, or None only after every attempt failed."""
    for attempt in range(attempts):
        if not wait_comfy():
            return None
        try:
            out = submit_and_wait(build_wf(), max_wait_s=150)
        except Exception as error:
            print("verdure-ai: attempt %d/%d failed (%s)" % (attempt + 1, attempts, error))
            out = None
        if out is not None:
            return out
        # ComfyUI likely crashed mid-run — give it a moment before retrying.
        time.sleep(3)
    return None


def run_identify(image_bytes):
    def build():
        name = upload_image(image_bytes)
        wf = load_workflow("identify_plant.json")
        wf["prompt"]["1"]["inputs"]["image"] = name
        wf["prompt"]["2"]["inputs"]["seed"] = random.randint(1, 2**31 - 1)
        return wf

    text = submit_resilient(build)
    if not text or text.strip().lower() == "none":
        return None
    return text.strip()


def run_diagnose(image_bytes):
    def build():
        name = upload_image(image_bytes)
        wf = load_workflow("diagnose_plant.json")
        wf["prompt"]["1"]["inputs"]["image"] = name
        wf["prompt"]["2"]["inputs"]["seed"] = random.randint(1, 2**31 - 1)
        return wf

    text = submit_resilient(build)
    if not text or text.strip().lower() == "none":
        return None
    return text.strip()


def run_embed(text):
    def build():
        wf = load_workflow("embed_text.json")
        wf["prompt"]["1"]["inputs"]["text"] = text
        return wf

    out = submit_resilient(build)
    if not out:
        return None
    try:
        vector = json.loads(out)
    except json.JSONDecodeError:
        return None
    return vector if isinstance(vector, list) and vector else None


def decode_image(encoded):
    """The bytes of a base64 string, or None when it is missing or not base64."""
    if not isinstance(encoded, str) or not encoded:
        return None
    try:
        return base64.b64decode(encoded, validate=True)
    except binascii.Error:
        return None


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, body):
        payload = json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass

    def do_OPTIONS(self):
        self._json(204, {})

    def do_GET(self):
        if self.path == "/health":
            return self._json(
                200,
                {
                    "status": "ok",
                    "comfy_up": comfy_up(),
                    "on_demand": bool(COMFY_CONTAINER),
                    "warmed": _warmed,
                },
            )
        return self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path not in ("/identify", "/diagnose", "/embed"):
            return self._json(404, {"error": "not found"})

        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            return self._json(400, {"error": "a valid Content-Length is required"})
        if length < 0:
            return self._json(400, {"error": "a valid Content-Length is required"})
        if length > MAX_BODY_BYTES:
            return self._json(413, {"error": "body too large"})
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            return self._json(400, {"error": "invalid JSON body"})
        if not isinstance(data, dict):
            return self._json(400, {"error": "JSON object expected"})

        # Validate input before spending a (possibly cold) GPU start.
        text = data.get("text")
        image = None
        if self.path == "/embed":
            if not isinstance(text, str) or not text.strip():
                return self._json(400, {"error": "text is required"})
        else:
            image = decode_image(data.get("image"))
            if image is None:
                return self._json(400, {"error": "image (base64) is required"})

        # Mark busy BEFORE booting ComfyUI so the idle reaper won't stop it out
        # from under a request that is still waiting for it to come up.
        _begin()
        try:
            # On-demand: boot ComfyUI now if it is asleep (first call is slow).
            if not ensure_comfy_ready():
                return self._json(503, {"error": "AI is starting up, try again shortly"})
            if self.path == "/identify":
                return self._json(200, {"species": run_identify(image)})
            if self.path == "/diagnose":
                return self._json(200, {"diagnosis": run_diagnose(image)})
            return self._json(200, {"embedding": run_embed(text.strip())})
        except Exception as e:
            print("verdure-ai: %s failed (%s)" % (self.path, e))
            return self._json(500, {"error": str(e)})
        finally:
            _end()


def warmup():
    """Load the vision model once at startup (VRAM is empty then, so the load is
    clean and stays resident via keep_model_loaded) — the first real identify is
    then warm (~3s) instead of paying the cold load and its VRAM-crash risk."""
    global _warmed
    if wait_comfy(cap_s=300):
        try:
            with open(os.path.join(HERE, "warmup.jpg"), "rb") as f:
                run_identify(f.read())
            _warmed = True
            print("verdure-ai: vision model warmed up")
        except Exception as e:
            print("verdure-ai: warmup skipped (%s)" % e)


if __name__ == "__main__":
    print("verdure-ai api ready on http://%s:%d (comfy: %s)" % (HOST, PORT, COMFY))
    if COMFY_CONTAINER:
        print(
            "verdure-ai: on-demand mode (container=%s, idle stop=%ds)"
            % (COMFY_CONTAINER, IDLE_TIMEOUT_S)
        )
        threading.Thread(target=idle_reaper, daemon=True).start()
    else:
        threading.Thread(target=warmup, daemon=True).start()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
