"""verdure IA — lanceur avec icone dans la barre des taches (systray).

Lance par le pythonw.exe portable du dossier (aucune fenetre console). Au
demarrage il OUVRE une petite page de statut locale (branding verdure) qui montre
en direct chaque etape, et affiche une icone dans la barre :
  - grise  : demarrage en cours
  - orange : pret, en attente de confirmation de la connexion
  - verte  : connecte (l'ordinateur est relie a verdure)
Clic droit -> Quitter arrete tout proprement.

Comme le python embarque de ComfyUI n'a pas tkinter, le retour visuel passe par
une page servie en local + une notification Windows (pystray/win32).
"""

import json
import os
import socket
import subprocess
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))


def _find_python():
    # En mode fusion, le python de l'utilisateur est souvent "python_embeded"
    # (ComfyUI officiel) plutot que notre "python".
    for name in ("python", "python_embeded"):
        p = os.path.join(HERE, name, "python.exe")
        if os.path.exists(p):
            return p
    return os.path.join(HERE, "python", "python.exe")


PY = _find_python()
COMFY = os.path.join(HERE, "ComfyUI")

# Tout en 127.0.0.1 (IPv4 explicite) : "localhost" peut resoudre en ::1 alors que
# les services ecoutent en IPv4.
os.environ["COMFY_URL"] = "http://127.0.0.1:8189"
os.environ["VERDURE_BACK_URL"] = "https://api.verdure.mtxlab.xyz"
os.environ["AI_API_URL"] = "http://127.0.0.1:8000"
os.environ["VERDURE_TOKEN_FILE"] = os.path.join(HERE, "worker-token")
os.environ["HF_HOME"] = os.path.join(HERE, "hf-cache")

# Ou envoyer l'utilisateur une fois l'IA prete et connectee (redirection auto de
# la page de statut vers le site verdure).
VERDURE_SITE = os.environ.get("VERDURE_SITE_URL", "https://verdure.mtxlab.xyz")

CREATE_NO_WINDOW = 0x08000000  # pas de fenetre pour les sous-processus
TOKEN_FILE = os.environ["VERDURE_TOKEN_FILE"]
STATUS_HOST = "127.0.0.1"

procs = []
# Etat de chaque etape : "pending" -> "running" -> "done" (ou "error").
state = {
    "comfy": "pending",
    "api": "pending",
    "worker": "pending",
    "warm": "pending",  # prechauffage du modele de vision (1er scan rapide)
    "connected": False,
    "error": None,
}


def _spawn(args, cwd):
    p = subprocess.Popen([PY] + args, cwd=cwd, creationflags=CREATE_NO_WINDOW)
    procs.append(p)
    return p


def _port_open(host, port):
    try:
        with socket.create_connection((host, port), timeout=2):
            return True
    except OSError:
        return False


def _wait_port(host, port, timeout=300):
    start = time.time()
    while time.time() - start < timeout:
        if _port_open(host, port):
            return True
        time.sleep(2)
    return False


def _wait_warmed(timeout=180):
    """Attend que l'api signale le modele charge (GET /health -> warmed:true)."""
    import urllib.request

    url = os.environ["AI_API_URL"].rstrip("/") + "/health"
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=3) as r:
                if json.loads(r.read()).get("warmed"):
                    return True
        except Exception:
            pass
        time.sleep(2)
    return False


def _start_stack():
    try:
        state["comfy"] = "running"
        _spawn(["main.py", "--port", "8189", "--listen", "127.0.0.1", "--cpu"], COMFY)
        if not _wait_port("127.0.0.1", 8189, 300):
            state["comfy"] = "error"
            state["error"] = "Le moteur ComfyUI n'a pas demarre."
            return
        state["comfy"] = "done"

        state["api"] = "running"
        _spawn(["app.py"], os.path.join(HERE, "api"))
        time.sleep(3)
        state["api"] = "done"

        state["worker"] = "running"
        _spawn([os.path.join("worker", "app.py")], HERE)
        state["worker"] = "done"

        # L'api charge le modele de vision en tache de fond (warmup) des que
        # ComfyUI repond. On suit /health pour afficher quand le 1er scan sera
        # chaud (~3 s au lieu de 20-30 s a froid).
        state["warm"] = "running"
        if _wait_warmed(180):
            state["warm"] = "done"
        else:
            state["warm"] = "done"  # non bloquant : le 1er scan chauffera sinon
    except Exception as exc:  # noqa: BLE001 — on veut afficher n'importe quelle erreur
        state["error"] = str(exc)


# ---------------------------------------------------------------------------
# Icone de la barre des taches
# ---------------------------------------------------------------------------
def _phase():
    if state["error"]:
        return "starting"
    if state["connected"]:
        return "connected"
    if state["worker"] == "done":
        return "ready"
    return "starting"


def _make_icon(phase):
    from PIL import Image, ImageDraw

    colors = {
        "starting": (161, 161, 170),  # gris
        "ready": (234, 179, 8),  # orange
        "connected": (34, 197, 94),  # vert
    }
    try:
        img = Image.open(os.path.join(HERE, "verdure.png")).convert("RGBA").resize((64, 64))
    except Exception:
        img = Image.new("RGBA", (64, 64), (22, 163, 74, 255))
    d = ImageDraw.Draw(img)
    c = colors.get(phase, colors["starting"])
    d.ellipse((39, 39, 63, 63), fill=(255, 255, 255))
    d.ellipse((42, 42, 60, 60), fill=c)
    return img


TITLES = {
    "starting": "verdure IA — demarrage...",
    "ready": "verdure IA — pret (confirmez la connexion)",
    "connected": "verdure IA — connecte",
}


def _poll(icon):
    """Met l'icone a jour + notifie aux transitions importantes."""
    last = None
    notified_ready = False
    while True:
        if os.path.exists(TOKEN_FILE):
            state["connected"] = True
        phase = _phase()
        if phase != last:
            icon.icon = _make_icon(phase)
            icon.title = TITLES.get(phase, TITLES["starting"])
            if phase == "connected":
                _notify(icon, "Ton ordinateur est relie a verdure.", "verdure IA — connecte")
            elif phase == "ready" and not notified_ready:
                _notify(
                    icon,
                    "Pret. Confirme la connexion dans l'onglet ouvert.",
                    "verdure IA",
                )
                notified_ready = True
            last = phase
        time.sleep(2)


def _notify(icon, message, title):
    try:
        icon.notify(message, title)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Page de statut locale (retour visuel du demarrage)
# ---------------------------------------------------------------------------
STATUS_PORT = {"value": 8790}

PAGE = """<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>verdure IA</title><style>
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#f6faf6;color:#14281d;font:16px/1.5 system-ui,Segoe UI,sans-serif}
@media(prefers-color-scheme:dark){body{background:#0d130f;color:#e7f2ea}}
.card{width:min(92vw,440px);padding:32px 28px;border-radius:20px;background:#fff;
box-shadow:0 10px 40px rgba(0,0,0,.08)}
@media(prefers-color-scheme:dark){.card{background:#141c17;box-shadow:0 10px 40px rgba(0,0,0,.5)}}
.head{display:flex;align-items:center;gap:12px;margin-bottom:6px}
.logo{width:40px;height:40px;flex:none}
h1{font-size:20px;margin:0;font-weight:700}
.sub{color:#5b7065;font-size:14px;margin:0 0 22px}
@media(prefers-color-scheme:dark){.sub{color:#8fa89a}}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px}
li{display:flex;align-items:center;gap:12px}
.dot{width:22px;height:22px;flex:none;border-radius:50%;display:flex;align-items:center;
justify-content:center;font-size:13px;font-weight:700;color:#fff;background:#c9d4ce}
.dot.run{background:#eab308}.dot.done{background:#16a34a}.dot.err{background:#dc2626}
@media(prefers-color-scheme:dark){.dot{background:#33413a}}
.txt{font-weight:600}.note{color:#5b7065;font-size:13px;font-weight:400}
@media(prefers-color-scheme:dark){.note{color:#8fa89a}}
.spin{width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;
animation:s .7s linear infinite}@keyframes s{to{transform:rotate(360deg)}}
.banner{margin-top:22px;padding:14px 16px;border-radius:12px;font-size:14px;display:none}
.banner.ok{display:block;background:#dcfce7;color:#14532d}
.banner.err{display:block;background:#fee2e2;color:#7f1d1d}
@media(prefers-color-scheme:dark){.banner.ok{background:#0f2f1c;color:#a7f3c9}
.banner.err{background:#3a1414;color:#fca5a5}}
</style></head><body><div class="card">
<div class="head">
<svg class="logo" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#16a34a"/>
<path d="M16 26v-9" fill="none" stroke="#dcfce7" stroke-width="2.4" stroke-linecap="round"/>
<path d="M16 18C15 13 10.5 10.5 6 11c-.4 5 3.6 8.4 8.2 7.4z" fill="#bbf7d0"/>
<path d="M16.4 15.6C16 10.8 20 7.4 25 7c.6 5-2.8 8.8-7.6 8.9z" fill="#ecfdf5"/></svg>
<div><h1>verdure IA</h1></div></div>
<p class="sub">Demarrage de l'assistant d'identification sur ton ordinateur.</p>
<ul id="steps"></ul>
<div id="banner" class="banner"></div>
</div><script>
const STEPS=[
 ["comfy","Moteur ComfyUI","premier demarrage ~1 min"],
 ["api","Service d'identification",""],
 ["worker","Connexion a verdure",""],
 ["warm","Prechauffage du modele","~30 s, pour un 1er scan rapide"]];
function icon(s){if(s==="done")return'✓';if(s==="error")return'!';
 if(s==="running")return'<span class="spin"></span>';return'';}
function cls(s){return s==="done"?"done":s==="running"?"run":s==="error"?"err":"";}
async function tick(){let d;try{d=await(await fetch("/status")).json()}catch(e){return}
 let h="";for(const[k,label,note]of STEPS){const s=d[k]||"pending";
  h+=`<li><span class="dot ${cls(s)}">${icon(s)}</span>`+
     `<span class="txt">${label}</span>`+(note?` <span class="note">${note}</span>`:"")+`</li>`;}
 document.getElementById("steps").innerHTML=h;
 const b=document.getElementById("banner");
 if(d.error){b.className="banner err";b.textContent="Erreur : "+d.error;}
 else if(d.connected&&d.warm==="done"){b.className="banner ok";
   b.textContent="Pret et connecte. Ouverture de verdure...";goToSite(d.site);}
 else if(d.connected){b.className="banner ok";b.textContent="Connecte. Prechauffage du modele en cours (1er scan bientot rapide)...";}
 else if(d.ready){b.className="banner ok";b.textContent="Pret. Confirme la connexion si l'onglet verdure te le demande.";}
 else{b.className="banner";}}
// Une fois pret ET connecte, on bascule l'onglet sur le site verdure (une seule
// fois). Court delai pour laisser voir le "pret".
let redirected=false;
function goToSite(site){if(redirected||!site)return;redirected=true;
 setTimeout(function(){window.location.href=site;},2500);}
tick();setInterval(tick,1500);
</script></body></html>"""


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 (API http.server)
        if self.path.startswith("/status"):
            body = json.dumps(
                {
                    "comfy": state["comfy"],
                    "api": state["api"],
                    "worker": state["worker"],
                    "warm": state["warm"],
                    "ready": state["worker"] == "done" and not state["connected"],
                    "connected": state["connected"],
                    "error": state["error"],
                    "site": VERDURE_SITE,
                }
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            body = PAGE.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def log_message(self, *_args):  # silence (pas de console)
        pass


def _serve_status():
    for port in range(8790, 8800):
        try:
            httpd = ThreadingHTTPServer((STATUS_HOST, port), _Handler)
            STATUS_PORT["value"] = port
            httpd.serve_forever()
            return
        except OSError:
            continue


def _status_url():
    return "http://%s:%d/" % (STATUS_HOST, STATUS_PORT["value"])


def _open_status(_icon=None, _item=None):
    try:
        webbrowser.open(_status_url())
    except Exception:
        pass


# ---------------------------------------------------------------------------
def _quit(icon, _item):
    for p in procs:
        try:
            p.terminate()
        except Exception:
            pass
    icon.stop()


def main():
    import pystray

    # 1) page de statut locale, puis on l'ouvre tout de suite : retour visuel.
    threading.Thread(target=_serve_status, daemon=True).start()
    time.sleep(0.4)  # laisse le serveur prendre son port
    _open_status()

    icon = pystray.Icon(
        "verdure-ai",
        _make_icon("starting"),
        TITLES["starting"],
        menu=pystray.Menu(
            pystray.MenuItem("Ouvrir le statut", _open_status, default=True),
            pystray.MenuItem("Quitter verdure IA", _quit),
        ),
    )
    threading.Thread(target=_start_stack, daemon=True).start()
    threading.Thread(target=_poll, args=(icon,), daemon=True).start()
    icon.run()


if __name__ == "__main__":
    main()
