# verdure — lance la copie IA isolee (ComfyUI dedie + ai-api + worker).
# Relocatable : utilise le Python portable du dossier (chemins relatifs), donc le
# dossier marche tel quel une fois copie/extrait, quel que soit l'utilisateur.
# Clic droit -> Executer avec PowerShell. Garde la fenetre ouverte.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$py = Join-Path $PSScriptRoot 'python\python.exe'
$comfy = Join-Path $PSScriptRoot 'ComfyUI'

# Port dedie (8189) pour ne pas entrer en conflit avec un ComfyUI sur 8188.
$env:COMFY_URL = 'http://localhost:8189'
$env:VERDURE_BACK_URL = 'https://verdureee.duckdns.org'
$env:AI_API_URL = 'http://localhost:8000'
$env:VERDURE_TOKEN_FILE = Join-Path $PSScriptRoot 'worker-token'
# Modeles Hugging Face (nomic-embed) telecharges DANS le dossier (pas dans le
# profil), pour que tout reste self-contained et deplacable.
$env:HF_HOME = Join-Path $PSScriptRoot 'hf-cache'

Write-Host 'Demarrage de ComfyUI (isole, port 8189)...' -ForegroundColor Green
# --cpu : torch est en version CPU (leger). ComfyUI tourne donc sur CPU, mais
# l'identification reste sur le GPU via llama-cpp (son propre CUDA), et
# l'embedding (nomic, petit) tourne tres bien sur CPU. Sans --cpu, ComfyUI
# plante ("Torch not compiled with CUDA enabled").
Start-Process -FilePath $py `
  -ArgumentList 'main.py', '--port', '8189', '--listen', '127.0.0.1', '--cpu' `
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
