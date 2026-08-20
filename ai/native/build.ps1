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

# Compile the installer into a double-clickable .exe (for non-developers). Needs
# the ps2exe module (installed on demand).
if (-not (Get-Command Invoke-PS2EXE -ErrorAction SilentlyContinue)) {
  try { Install-PackageProvider -Name NuGet -Force -Scope CurrentUser -ErrorAction Stop | Out-Null } catch {}
  Set-PSRepository -Name PSGallery -InstallationPolicy Trusted -ErrorAction SilentlyContinue
  Install-Module -Name ps2exe -Scope CurrentUser -Force -AllowClobber
}
Invoke-PS2EXE -inputFile (Join-Path $root 'install-native.ps1') `
  -outputFile (Join-Path $dest 'verdure-installer.exe') `
  -title 'verdure - installation IA' -product 'verdure' -company 'verdure' `
  -version '1.0.0' -noConfigFile | Out-Null

$size = [math]::Round((Get-Item (Join-Path $dest 'verdure-ai-native.tgz')).Length / 1KB)
Write-Host "Published $dest\ : verdure-ai-native.tgz ($size KB) + install-native.ps1 + verdure-installer.exe"
