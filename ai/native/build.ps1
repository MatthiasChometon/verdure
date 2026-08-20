# Publishes the native (Docker-free) worker install for "Activate AI":
#   front/public/worker/verdure-ai-native.tgz  — ai-api + worker + verdure_embed + start.ps1
#   front/public/worker/install-native.ps1     — installs into the user's ComfyUI
# Re-run whenever the ai-api, worker, verdure_embed node or these files change.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot                        # ai/native
$ai = Split-Path $root -Parent               # ai
$repo = Split-Path $ai -Parent               # verdure
$dest = Join-Path $repo 'front\public\worker'
$stage = Join-Path $env:TEMP 'verdure-ai-native'

if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

# ai-api (stdlib): app.py, warmup.jpg, workflows/
Copy-Item -Recurse (Join-Path $ai 'api') (Join-Path $stage 'api')
# worker (stdlib)
Copy-Item -Recurse (Join-Path $ai 'worker') (Join-Path $stage 'worker')
# the verdure_embed custom node, dropped into ComfyUI by the installer
Copy-Item -Recurse (Join-Path $ai 'comfyui\custom_nodes\verdure_embed') (Join-Path $stage 'verdure_embed')
# launcher + readme
Copy-Item (Join-Path $root 'start.ps1') $stage
Copy-Item (Join-Path $root 'README.md') $stage

New-Item -ItemType Directory -Force -Path $dest | Out-Null
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'
& $tar -czf (Join-Path $dest 'verdure-ai-native.tgz') -C $stage .
Copy-Item (Join-Path $root 'install-native.ps1') $dest -Force

$size = [math]::Round((Get-Item (Join-Path $dest 'verdure-ai-native.tgz')).Length / 1KB)
Write-Host "Published $dest\verdure-ai-native.tgz ($size KB) + install-native.ps1"
