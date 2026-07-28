"""Small HTTP wrapper (Python standard library only) that fronts the ComfyUI
pipelines for the verdure back. It injects the request into an API-format
workflow, submits it to ComfyUI and reads the graph output back.

Endpoints
  GET  /health   -> {"status":"ok","comfy_up":bool}
  POST /identify body {"image":"<base64 JPEG>"} -> {"species":"Genus species"|null}
  POST /embed    body {"text":"..."}            -> {"embedding":[...]|null}
"""

import json
import os
import random
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

COMFY = os.environ.get("COMFY_URL", "http://comfyui:8188").rstrip("/")
HOST, PORT = "0.0.0.0", 8000
HERE = os.path.dirname(os.path.abspath(__file__))
WORKFLOWS = os.path.join(HERE, "workflows")


def comfy_post(path, payload):
    req = urllib.request.Request(
        COMFY + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def comfy_get(path):
    with urllib.request.urlopen(COMFY + path, timeout=30) as r:
        return json.loads(r.read())


def comfy_up():
    try:
        urllib.request.urlopen(COMFY + "/", timeout=3)
        return True
    except Exception:
        return False


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
    with urllib.request.urlopen(req, timeout=30) as r:
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
    queue), returning the PreviewAny text or None on error/timeout."""
    pid = comfy_post("/prompt", wf).get("prompt_id")
    if not pid:
        return None
    deadline = time.time() + max_wait_s
    lost = 0
    while time.time() < deadline:
        time.sleep(1)
        try:
            entry = comfy_get("/history/" + pid).get(pid)
        except Exception:
            continue
        if entry:
            if entry.get("status", {}).get("status_str") == "error":
                return None
            if entry.get("outputs"):
                return history_text(entry)
            continue
        if prompt_queued(pid):
            lost = 0
        elif (lost := lost + 1) > 8:
            return None
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
        except Exception:
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
            return self._json(200, {"status": "ok", "comfy_up": comfy_up()})
        return self._json(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            return self._json(400, {"error": "invalid JSON body"})

        if not comfy_up():
            return self._json(503, {"error": "ComfyUI is offline"})

        if self.path == "/identify":
            b64 = data.get("image") or ""
            if not b64:
                return self._json(400, {"error": "image (base64) is required"})
            import base64

            try:
                species = run_identify(base64.b64decode(b64))
                return self._json(200, {"species": species})
            except Exception as e:
                return self._json(500, {"error": str(e)})

        if self.path == "/embed":
            text = (data.get("text") or "").strip()
            if not text:
                return self._json(400, {"error": "text is required"})
            try:
                return self._json(200, {"embedding": run_embed(text)})
            except Exception as e:
                return self._json(500, {"error": str(e)})

        return self._json(404, {"error": "not found"})


def warmup():
    """Load the vision model once at startup (VRAM is empty then, so the load is
    clean and stays resident via keep_model_loaded) — the first real identify is
    then warm (~3s) instead of paying the cold load and its VRAM-crash risk."""
    if wait_comfy(cap_s=300):
        try:
            with open(os.path.join(HERE, "warmup.jpg"), "rb") as f:
                run_identify(f.read())
            print("verdure-ai: vision model warmed up")
        except Exception as e:
            print("verdure-ai: warmup skipped (%s)" % e)


if __name__ == "__main__":
    print("verdure-ai api ready on http://%s:%d (comfy: %s)" % (HOST, PORT, COMFY))
    threading.Thread(target=warmup, daemon=True).start()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
