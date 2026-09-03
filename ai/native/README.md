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

---

## Pour le mainteneur — mise à jour incrémentale

Les deux installeurs (`verdure ia.exe` compilé depuis `verdure-ai.iss`, et
`install-native.ps1`) ne retéléchargent plus l'archive complète à chaque
lancement. Un **`manifest.json`** publié à côté des archives décrit chaque
composant avec son empreinte **SHA-256** et sa taille. Au lancement, l'installeur
télécharge d'abord ce manifeste (quelques octets), le compare à l'**état local**
écrit à la dernière install, et ne récupère que les composants **absents ou dont
l'empreinte a changé**. Trois cas détectés automatiquement :

- **création** : aucune ComfyUI cible → runtime complet + pièces verdure ;
- **fusion** : une ComfyUI existe déjà (celle de l'utilisateur) → seules les pièces
  verdure sont ajoutées, le runtime n'est jamais retéléchargé ;
- **mise à jour** : état verdure présent → diff par empreinte, seul le neuf est pris.

Intégrité : chaque téléchargement est vérifié par son SHA-256. Reprise : l'état
local est écrit composant par composant, donc une install interrompue reprend au
relancement (`{app}\verdure-state.txt` côté exe ; `verdure-manifest.local.json`
côté script).

### Régénérer l'`.exe`
`verdure-ai.iss` se compile avec **ISCC.exe** (Inno Setup 6) :

```
& "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe" ai\native\verdure-ai.iss
```

Sort `verdure ia.exe` dans `ai\native\`. À uploader sur o2switch `dl/`.

### Publier une nouvelle version (action d'hébergement requise)
1. Reconstruire les archives changées (`verdure-ai.zip` = runtime complet ~5,5 Go,
   `verdure-parts.zip` = pièces verdure ; `verdure-ai-native.tgz` pour le script).
2. Régénérer le manifeste **dans le dossier des archives** :
   - ligne exe (o2switch `dl/`) : `ai\native\make-manifest.ps1 -Dir <dl> -Version <v>`
     → écrit `dl\manifest.json` (composants `runtime` + `parts`).
   - ligne script (front `/worker/`) : `ai\native\build.ps1` régénère
     `verdure-ai-native.tgz` **et** `manifest.json` (composant `native`).
3. **Uploader `manifest.json` en même temps que les archives modifiées.** Le
   manifeste doit toujours refléter les fichiers réellement en ligne, sinon la
   vérification d'empreinte fera échouer le téléchargement.
