"""verdure IA — lanceur avec icone dans la barre des taches (systray).

Lance par le pythonw.exe portable du dossier (aucune fenetre console). Demarre
ComfyUI + l'ai-api + le worker, et affiche une petite icone :
  - grise  : demarrage en cours
  - orange : pret, en attente de confirmation de la connexion
  - verte  : connecte (l'ordinateur est relie a verdure)
Clic droit -> Quitter arrete tout proprement.
"""

import os
import socket
import subprocess
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
PY = os.path.join(HERE, "python", "python.exe")
COMFY = os.path.join(HERE, "ComfyUI")

# Tout en 127.0.0.1 (IPv4 explicite) : "localhost" peut resoudre en ::1 alors que
# les services ecoutent en IPv4.
os.environ["COMFY_URL"] = "http://127.0.0.1:8189"
os.environ["VERDURE_BACK_URL"] = "https://verdureee.duckdns.org"
os.environ["AI_API_URL"] = "http://127.0.0.1:8000"
os.environ["VERDURE_TOKEN_FILE"] = os.path.join(HERE, "worker-token")
os.environ["HF_HOME"] = os.path.join(HERE, "hf-cache")

CREATE_NO_WINDOW = 0x08000000  # pas de fenetre pour les sous-processus
TOKEN_FILE = os.environ["VERDURE_TOKEN_FILE"]

procs = []
state = {"phase": "starting"}  # starting -> ready -> connected


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


def _start_stack():
    _spawn(["main.py", "--port", "8189", "--listen", "127.0.0.1", "--cpu"], COMFY)
    _wait_port("127.0.0.1", 8189, 300)
    _spawn(["app.py"], os.path.join(HERE, "api"))
    time.sleep(3)
    _spawn([os.path.join("worker", "app.py")], HERE)
    state["phase"] = "ready"


def _make_icon(phase):
    from PIL import Image, ImageDraw

    colors = {
        "starting": (161, 161, 170),  # gris
        "ready": (234, 179, 8),  # orange
        "connected": (34, 197, 94),  # vert
    }
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((6, 6, 58, 58), fill=colors.get(phase, colors["starting"]))
    # petite feuille blanche
    d.ellipse((22, 20, 42, 44), fill=(255, 255, 255))
    d.line((32, 42, 32, 24), fill=colors.get(phase, colors["starting"]), width=3)
    return img


TITLES = {
    "starting": "verdure IA — demarrage...",
    "ready": "verdure IA — pret (confirmez la connexion)",
    "connected": "verdure IA — connecte",
}


def _poll(icon):
    """Met l'icone a jour : verte des que le worker est appaire (token present)."""
    last = None
    while True:
        phase = state["phase"]
        if phase != "starting" and os.path.exists(TOKEN_FILE):
            phase = "connected"
        if phase != last:
            icon.icon = _make_icon(phase)
            icon.title = TITLES.get(phase, TITLES["starting"])
            last = phase
        time.sleep(3)


def _quit(icon, _item):
    for p in procs:
        try:
            p.terminate()
        except Exception:
            pass
    icon.stop()


def main():
    import pystray

    icon = pystray.Icon(
        "verdure-ai",
        _make_icon("starting"),
        TITLES["starting"],
        menu=pystray.Menu(pystray.MenuItem("Quitter verdure IA", _quit)),
    )
    threading.Thread(target=_start_stack, daemon=True).start()
    threading.Thread(target=_poll, args=(icon,), daemon=True).start()
    icon.run()


if __name__ == "__main__":
    main()
