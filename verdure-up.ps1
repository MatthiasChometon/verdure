# Core bring-up for verdure (prod, local). No UI — used by both the desktop app
# and start-verdure.ps1. Starts Docker Desktop if needed, brings up the light
# web stack, and creates ComfyUI stopped (ai-api starts it on demand).
param([string]$Root = 'C:\projets\verdure')
$ErrorActionPreference = 'SilentlyContinue'

function Test-Docker { docker ps *> $null; return $? }

if (-not (Test-Docker)) {
  $exe = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $exe) { Start-Process $exe }
  for ($i = 0; $i -lt 60; $i++) { Start-Sleep 3; if (Test-Docker) { break } }
  if (-not (Test-Docker)) { Write-Error 'Docker ne repond pas.'; exit 1 }
}

Set-Location $Root
$files = @('-f', 'docker-compose.prod.yml')
if (Test-Path (Join-Path $Root 'docker-compose.override.yml')) {
  $files += @('-f', 'docker-compose.override.yml')
}

docker compose @files up -d --remove-orphans
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# ComfyUI is in the 'ai' profile (not started by `up`): create it stopped so
# ai-api can start it on the first identify and stop it again when idle.
docker compose @files --profile ai create comfyui
exit 0
