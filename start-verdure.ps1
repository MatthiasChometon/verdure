# verdure — one-click standalone launcher (opens the app in your browser).
# Starts Docker Desktop if it's off, brings up the production stack, then opens
# the app. For the tray app with a live status light, use the desktop/ app.
$ErrorActionPreference = 'SilentlyContinue'
$root = $PSScriptRoot

function Write-Step($msg) { Write-Host "  $msg" -ForegroundColor Cyan }

Write-Host ''
Write-Host '  verdure' -ForegroundColor Green
Write-Host ''

# 1-2. Docker + bring up the prod stack (shared core, no divergence).
Write-Step 'Demarrage de verdure (prod)... (le 1er lancement peut prendre quelques minutes)'
& (Join-Path $root 'verdure-up.ps1') -Root $root
if ($LASTEXITCODE -ne 0) {
  Write-Host '  Docker ne repond pas. Lance Docker Desktop a la main puis reessaie.' -ForegroundColor Red
  Read-Host '  Entree pour fermer'
  exit 1
}

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
