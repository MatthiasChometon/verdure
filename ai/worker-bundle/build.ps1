# Publishes the Docker worker bundle for the "Activate AI" one-line installer:
#   front/public/worker/verdure-worker.tgz  — ComfyUI + api + worker + compose
#   front/public/worker/install.ps1         — downloads + extracts + runs it
# Re-run whenever the bundle files or ai/{comfyui,api,worker} change. A .tgz (not
# a .zip) so the installer extracts it with Windows' built-in `tar` — no broken
# "extract compressed folder" wizard, and dotfiles like .env survive.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot                       # ai/worker-bundle
$ai = Split-Path $root -Parent              # ai
$repo = Split-Path $ai -Parent              # verdure
$dest = Join-Path $repo 'front\public\worker'
$stage = Join-Path $env:TEMP 'verdure-worker-bundle'

if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

Copy-Item (Join-Path $root 'docker-compose.yml') $stage
Copy-Item (Join-Path $root '.env.worker') (Join-Path $stage '.env')
Copy-Item (Join-Path $root 'README.md') $stage
foreach ($svc in 'comfyui', 'api', 'worker') {
  Copy-Item -Recurse (Join-Path $ai $svc) (Join-Path $stage $svc)
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null
# Windows' own bsdtar — a GNU tar on PATH (Git/MSYS) reads the C: as a remote host.
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'
& $tar -czf (Join-Path $dest 'verdure-worker.tgz') -C $stage .
Copy-Item (Join-Path $root 'install.ps1') $dest -Force

# Drop artefacts from earlier delivery attempts.
foreach ($old in 'verdure-worker.zip', 'verdure-worker.py') {
  $p = Join-Path $dest $old
  if (Test-Path $p) { Remove-Item -Force $p }
}

$size = [math]::Round((Get-Item (Join-Path $dest 'verdure-worker.tgz')).Length / 1KB)
Write-Host "Published $dest\verdure-worker.tgz ($size KB) + install.ps1"
