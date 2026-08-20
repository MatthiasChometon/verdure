# verdure — IA locale (version légère, sans Docker)

Se branche sur **ton ComfyUI existant** : pas de ComfyUI en double, pas de Docker.

## Prérequis
- **ComfyUI** déjà installé et fonctionnel (avec une carte NVIDIA).
- ComfyUI lancé sur le port par défaut (`http://localhost:8188`).

## Installer
Ouvre **PowerShell** et colle :

```
irm https://verdure-plants.netlify.app/worker/install-native.ps1 | iex
```

L'installeur ajoute deux modules d'identification à ton ComfyUI, puis installe
l'`ai-api` + le worker (tous deux en Python pur) dans `…\verdure-ai`.

## Lancer
1. **Redémarre ComfyUI** (pour charger les nouveaux modules).
2. Lance : clic droit sur `verdure-ai\start.ps1` → *Exécuter avec PowerShell*
   (ou `powershell -ExecutionPolicy Bypass -File "%USERPROFILE%\verdure-ai\start.ps1"`).
3. Une page s'ouvre pour **confirmer la connexion** — rien à copier.

Les modèles se téléchargent tout seuls à la première identification (plusieurs
Go, une seule fois). Garde la fenêtre ouverte tant que tu veux identifier des
plantes.

## Arrêter
Ferme la fenêtre `start.ps1`. Ton ComfyUI, lui, continue de tourner normalement.
