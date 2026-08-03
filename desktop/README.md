# verdure desktop

A tiny system-tray launcher for the local prod stack, with a live status light.

- 🔴 stopped · 🟡 starting · 🟢 up — the tray dot reflects `http://localhost:3666`.
- Tray menu: **Ouvrir l'application · Panneau de contrôle · Démarrer · Arrêter · Quitter**.
- Left-click the tray → the control panel (status + buttons).
- **Démarrer** runs `verdure-up.ps1` (starts Docker Desktop if needed, brings up
  the light web stack, creates ComfyUI stopped). **Arrêter** runs `verdure-down.ps1`.
- **Ouvrir l'application** opens the app in its own native window (the app on PC).
- Registers itself to **launch at Windows startup** (tray only, via `--minimized`);
  Docker is never started automatically — only the status light shows.

The AI (ComfyUI) is **on-demand**: `ai-api` starts it on the first identify and
stops it after 15 min idle, so its VRAM/RAM is only spent while in use.

## Dev

```sh
pnpm install
pnpm tauri dev
```

## Build the installer

```sh
pnpm tauri build        # NSIS installer in src-tauri/target/release/bundle/nsis
```

## Notes

- The stack lives at `C:\projets\verdure` by default; override with the
  `VERDURE_DIR` environment variable.
- Icons are generated from the front's PWA icon: `pnpm tauri icon ../front/public/pwa-512.png`.
