# verdure — IA locale (copie isolée, sans Docker)

Installe une **copie dédiée** de l'IA dans `%USERPROFILE%\verdure-ai` : son propre
ComfyUI, son propre environnement Python, son propre port (8189). **Ne touche pas**
à ton ComfyUI principal, et ne télécharge que les **2 modèles de verdure**
(Qwen3-VL 4B pour l'identification, nomic-embed pour la recherche).

## Prérequis
- Une **carte NVIDIA**. Python et Git s'installent tout seuls (via winget) si absents.

## Installer
Ouvre **PowerShell** et colle :

```
irm https://verdure.mtxlab.xyz/worker/install-native.ps1 | iex
```

Gros téléchargement une seule fois (ComfyUI + torch CUDA). Pour viser un autre
dossier : `$env:VERDURE_COMFYUI_DIR` n'est plus utilisé — tout va dans `verdure-ai`.

## Lancer
Clic droit sur `verdure-ai\start.ps1` → *Exécuter avec PowerShell*
(ou `powershell -ExecutionPolicy Bypass -File "%USERPROFILE%\verdure-ai\start.ps1"`).
Ça lance le ComfyUI dédié (port 8189) + l'ai-api + le worker. Une page s'ouvre
pour **confirmer la connexion** — rien à copier.

Les modèles se téléchargent à la première identification (plusieurs Go, une fois).
Garde la fenêtre ouverte tant que tu utilises l'IA.

## Arrêter
Ferme la fenêtre `start.ps1`. Ton ComfyUI principal, lui, n'a jamais été touché.
