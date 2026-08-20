# Assembles the downloadable worker bundle into
# front/public/worker/verdure-worker.zip. Re-run this whenever the worker, the
# api/comfyui sources, or the bundle files change. The zip is a standalone
# mini-repo: `docker compose up` builds ComfyUI + api + worker locally and the
# worker pairs itself with the user's verdure account on first launch.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot                       # ai/worker-bundle
$ai = Split-Path $root -Parent              # ai
$repo = Split-Path $ai -Parent              # verdure
$stage = Join-Path $env:TEMP 'verdure-worker-bundle'
$out = Join-Path $repo 'front\public\worker\verdure-worker.zip'

if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

Copy-Item (Join-Path $root 'docker-compose.yml') $stage
Copy-Item (Join-Path $root '.env.worker') (Join-Path $stage '.env')
Copy-Item (Join-Path $root 'start.ps1') $stage
Copy-Item (Join-Path $root 'start.sh') $stage
Copy-Item (Join-Path $root 'README.md') $stage

foreach ($svc in 'comfyui', 'api', 'worker') {
  Copy-Item -Recurse (Join-Path $ai $svc) (Join-Path $stage $svc)
}

New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
if (Test-Path $out) { Remove-Item -Force $out }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $out -Force
Write-Host "Wrote $out ($([math]::Round((Get-Item $out).Length/1KB)) KB)"
