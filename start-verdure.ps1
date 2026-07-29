# verdure — one-click launcher.
# Starts Docker Desktop if it's off, brings up the production stack, then opens
# the app. Pin a shortcut to this (via start-verdure.bat) to the taskbar.
$ErrorActionPreference = 'SilentlyContinue'
$root = $PSScriptRoot

function Write-Step($msg) { Write-Host "  $msg" -ForegroundColor Cyan }

Write-Host ''
Write-Host '  🌿 verdure' -ForegroundColor Green
Write-Host ''

# 1. Docker Desktop up?
docker ps *> $null
if (-not $?) {
  Write-Step 'Docker Desktop est eteint -> demarrage...'
  $exe = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $exe) { Start-Process $exe }
  Write-Step 'Attente du demon Docker (jusqu''a 2 min)...'
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep 3
    docker ps *> $null
    if ($?) { break }
  }
  docker ps *> $null
  if (-not $?) {
    Write-Host '  Docker ne repond pas. Lance Docker Desktop a la main puis reessaie.' -ForegroundColor Red
    Read-Host '  Entree pour fermer'
    exit 1
  }
}
Write-Step 'Docker OK.'

# 2. Bring up the prod stack (reuse the local AI override when present).
Set-Location $root
$files = @('-f', 'docker-compose.prod.yml')
if (Test-Path (Join-Path $root 'docker-compose.override.yml')) {
  $files += @('-f', 'docker-compose.override.yml')
}
Write-Step 'Demarrage de verdure (prod)... (le 1er lancement peut prendre quelques minutes)'
docker compose @files up -d --remove-orphans 2>&1 | Out-Null

# 3. Wait for the app.
Write-Step 'Attente que l''app soit prete...'
$ready = $false
for ($i = 0; $i -lt 72; $i++) {
  try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3666/' -TimeoutSec 3 -UseBasicParsing
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch {}
  Start-Sleep 5
}

# 4. Show the URLs and open the browser.
$lan = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' } | Select-Object -First 1).IPAddress
Write-Host ''
if ($ready) {
  Write-Host '  verdure est prete !' -ForegroundColor Green
  Write-Host "    PC        : http://localhost:3666"
  if ($lan) { Write-Host "    Telephone : http://${lan}:3666   (meme WiFi)" -ForegroundColor Yellow }
  Start-Process 'http://localhost:3666'
} else {
  Write-Host '  L''app demarre encore (build en cours ?). Ouvre http://localhost:3666 dans une minute.' -ForegroundColor Yellow
}
Write-Host ''
Start-Sleep 5
