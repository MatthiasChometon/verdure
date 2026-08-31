# Stop verdure (prod, local): stops the web + AI containers but keeps them and
# their data volumes, so the next start is fast. Used by the desktop app.
param([string]$Root = 'C:\projets\verdure')
$ErrorActionPreference = 'SilentlyContinue'

Set-Location $Root
$files = @('-f', 'docker-compose.preprod.yml')
if (Test-Path (Join-Path $Root 'docker-compose.override.yml')) {
  $files += @('-f', 'docker-compose.override.yml')
}

# Include the 'ai' profile so ComfyUI is stopped too if it happens to be running.
docker compose @files --profile ai stop
exit 0
