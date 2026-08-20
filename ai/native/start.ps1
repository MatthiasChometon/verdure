# verdure — lance l'ai-api + le worker (branchés sur ton ComfyUI local).
# Double-cliquez ce fichier (clic droit -> Executer avec PowerShell), ou laissez
# l'installeur le lancer. Gardez la fenetre ouverte tant que vous utilisez l'IA.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# Le Python de ComfyUI, ecrit par l'installeur.
$py = (Get-Content (Join-Path $PSScriptRoot 'python.txt') -Raw).Trim()

$env:COMFY_URL = 'http://localhost:8188'
$env:VERDURE_BACK_URL = 'https://verdureee.duckdns.org'
$env:AI_API_URL = 'http://localhost:8000'
$env:VERDURE_TOKEN_FILE = Join-Path $PSScriptRoot 'worker-token'

Write-Host 'Demarrage du service IA (ai-api)...' -ForegroundColor Green
Start-Process -FilePath $py -ArgumentList 'app.py' `
  -WorkingDirectory (Join-Path $PSScriptRoot 'api')
Start-Sleep -Seconds 3

Write-Host 'Demarrage du worker — une page va s''ouvrir pour confirmer la connexion.' -ForegroundColor Green
& $py (Join-Path $PSScriptRoot 'worker\app.py')
