# verdure — installeur du worker IA (Docker fait tout).
# Usage : ouvrez PowerShell et collez :
#   irm https://verdure.mtxlab.xyz/worker/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$base = 'https://verdure.mtxlab.xyz/worker'
$dir = Join-Path $env:USERPROFILE 'verdure-worker'

Write-Host ''
Write-Host '  verdure — installation de l''IA locale' -ForegroundColor Green
Write-Host ''

# 1. Docker installe ?
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "  Docker Desktop n'est pas installe." -ForegroundColor Yellow
  Write-Host '  Installez-le (gratuit) : https://www.docker.com/products/docker-desktop'
  Write-Host '  Puis relancez cette commande.'
  return
}

# 2. Telechargement + extraction (tar, integre a Windows — pas de zip a ouvrir).
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$archive = Join-Path $env:TEMP 'verdure-worker.tgz'
Write-Host '  Telechargement...'
Invoke-WebRequest -Uri "$base/verdure-worker.tgz" -OutFile $archive
tar -xzf $archive -C $dir
Remove-Item $archive -Force

# 3. Docker construit et lance tout (ComfyUI + IA + worker). Le 1er lancement
#    telecharge les modeles (plusieurs Go) : c'est long une seule fois.
Set-Location $dir
Write-Host '  Demarrage. Le premier lancement telecharge les modeles, patientez...' -ForegroundColor Green
docker compose up -d --build

# 4. Attendre l'adresse de connexion imprimee par le worker, puis l'ouvrir.
$link = $null
for ($i = 0; $i -lt 360; $i++) {
  $logs = (docker compose logs worker 2>$null) -join "`n"
  $match = [regex]::Match($logs, 'https?://\S+/pair\?code=\w+')
  if ($match.Success) { $link = $match.Value; break }
  Start-Sleep -Seconds 10
}
Write-Host ''
if ($link) {
  Write-Host "  Ouvrez cette page et confirmez la connexion : $link" -ForegroundColor Green
  Start-Process $link
} else {
  Write-Host '  Toujours en preparation. La page de connexion apparaitra dans les logs :' -ForegroundColor Yellow
  Write-Host '    docker compose logs -f worker  (dans le dossier verdure-worker)'
}
Write-Host ''
Write-Host '  Pour arreter plus tard : docker compose down  (dans ' + $dir + ')'
