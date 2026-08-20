# verdure — lance la copie IA isolee (ComfyUI dedie + ai-api + worker).
# Clic droit -> Executer avec PowerShell. Garde la fenetre ouverte tant que tu
# utilises l'IA. Ton ComfyUI principal n'est pas touche.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$py = (Get-Content (Join-Path $PSScriptRoot 'python.txt') -Raw).Trim()
$comfy = Join-Path $PSScriptRoot 'ComfyUI'

# Port dedie (8189) pour ne pas entrer en conflit avec un ComfyUI sur 8188.
$env:COMFY_URL = 'http://localhost:8189'
$env:VERDURE_BACK_URL = 'https://verdureee.duckdns.org'
$env:AI_API_URL = 'http://localhost:8000'
$env:VERDURE_TOKEN_FILE = Join-Path $PSScriptRoot 'worker-token'

Write-Host 'Demarrage de ComfyUI (isole, port 8189)...' -ForegroundColor Green
Start-Process -FilePath $py `
  -ArgumentList 'main.py', '--port', '8189', '--listen', '127.0.0.1' `
  -WorkingDirectory $comfy

Write-Host 'Attente du demarrage de ComfyUI...'
for ($i = 0; $i -lt 150; $i++) {
  try { Invoke-WebRequest -UseBasicParsing 'http://localhost:8189/' -TimeoutSec 2 | Out-Null; break }
  catch { Start-Sleep -Seconds 2 }
}

Write-Host 'Demarrage du service IA (ai-api)...' -ForegroundColor Green
Start-Process -FilePath $py -ArgumentList 'app.py' `
  -WorkingDirectory (Join-Path $PSScriptRoot 'api')
Start-Sleep -Seconds 3

Write-Host 'Demarrage du worker — une page va s''ouvrir pour confirmer la connexion.' -ForegroundColor Green
& $py (Join-Path $PSScriptRoot 'worker\app.py')
