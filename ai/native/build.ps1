# Publishes the native (Docker-free) worker install for "Activate AI":
#   front/public/worker/verdure-ai-native.tgz  — ai-api + worker + verdure_embed + start.ps1
#   front/public/worker/install-native.ps1     — installs into the user's ComfyUI
# Re-run whenever the ai-api, worker, verdure_embed node or these files change.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot                        # ai/native
$ai = Split-Path $root -Parent               # ai
$repo = Split-Path $ai -Parent               # verdure
# Dossier public de la layer Nuxt `ai` -> servi par Netlify sous /worker/.
$dest = Join-Path $repo 'front\domain\ai\public\worker'
$stage = Join-Path $env:TEMP 'verdure-ai-native'

if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

# ai-api (stdlib) — only what runs it: app.py, warmup.jpg, workflows/ (no Dockerfile).
$apiDest = Join-Path $stage 'api'
New-Item -ItemType Directory -Force -Path $apiDest | Out-Null
Copy-Item (Join-Path $ai 'api\app.py') $apiDest
Copy-Item (Join-Path $ai 'api\warmup.jpg') $apiDest
Copy-Item -Recurse (Join-Path $ai 'api\workflows') (Join-Path $apiDest 'workflows')
# worker (stdlib) — only app.py (no Dockerfile).
$workerDest = Join-Path $stage 'worker'
New-Item -ItemType Directory -Force -Path $workerDest | Out-Null
Copy-Item (Join-Path $ai 'worker\app.py') $workerDest
# the verdure_embed custom node, dropped into ComfyUI by the installer
Copy-Item -Recurse (Join-Path $ai 'comfyui\custom_nodes\verdure_embed') (Join-Path $stage 'verdure_embed')
# launcher + readme
Copy-Item (Join-Path $root 'start.ps1') $stage
Copy-Item (Join-Path $root 'README.md') $stage

New-Item -ItemType Directory -Force -Path $dest | Out-Null
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'
& $tar -czf (Join-Path $dest 'verdure-ai-native.tgz') -C $stage .
Copy-Item (Join-Path $root 'install-native.ps1') $dest -Force
# Note : la livraison grand public = le dossier pre-bati (verdure-ai.tar) heberge
# sur o2switch. install-native.ps1 reste comme recette de (re)construction du
# dossier ; pas d'.exe (retire a la demande de Matthias).

$size = [math]::Round((Get-Item (Join-Path $dest 'verdure-ai-native.tgz')).Length / 1KB)

# Manifeste incrementiel : l'installeur natif (install-native.ps1) le telecharge et
# ne reprend les fichiers verdure que si leur empreinte a change. Un objet par ligne
# (JSON valide + lisible ligne a ligne). A publier a cote de verdure-ai-native.tgz.
$tgzPath = Join-Path $dest 'verdure-ai-native.tgz'
$sha = (Get-FileHash $tgzPath -Algorithm SHA256).Hash.ToLower()
$bytes = (Get-Item $tgzPath).Length
$version = Get-Date -Format 'yyyyMMdd-HHmm'
$manifest = '{"version":"' + $version + '","components":[' + "`n" +
  ('{{"id":"native","file":"verdure-ai-native.tgz","sha256":"{0}","size":{1},"strip":0}}' -f $sha, $bytes) +
  "`n" + ']}'
Set-Content -Path (Join-Path $dest 'manifest.json') -Value $manifest -Encoding UTF8 -NoNewline

Write-Host "Published $dest\ : verdure-ai-native.tgz ($size KB) + install-native.ps1 + manifest.json (v$version)"
