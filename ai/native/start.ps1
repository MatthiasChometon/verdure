# verdure — lance la copie IA isolee (ComfyUI dedie + ai-api + worker).
# Relocatable : utilise le Python portable du dossier (chemins relatifs), donc le
# dossier marche tel quel une fois copie/extrait, quel que soit l'utilisateur.
# Double-clic sur "Lancer verdure IA" (ou clic droit start.ps1 -> Executer avec PowerShell).
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$py = Join-Path $PSScriptRoot 'python\python.exe'
$comfy = Join-Path $PSScriptRoot 'ComfyUI'

# Tout en 127.0.0.1 (IPv4 explicite). "localhost" peut resoudre en ::1 (IPv6)
# alors que les services ecoutent en IPv4 -> la detection et les appels echouent.
$env:COMFY_URL = 'http://127.0.0.1:8189'
$env:VERDURE_BACK_URL = 'https://api.verdure.mtxlab.xyz'
$env:AI_API_URL = 'http://127.0.0.1:8000'
$env:VERDURE_TOKEN_FILE = Join-Path $PSScriptRoot 'worker-token'
# Modeles Hugging Face (nomic-embed) telecharges DANS le dossier (pas dans le
# profil), pour que tout reste self-contained et deplacable.
$env:HF_HOME = Join-Path $PSScriptRoot 'hf-cache'

Write-Host 'Demarrage de ComfyUI (isole, port 8189)...' -ForegroundColor Green
# --cpu : torch est en version CPU (leger). ComfyUI tourne donc sur CPU, mais
# l'identification reste sur le GPU via llama-cpp (son propre CUDA). Sans --cpu,
# ComfyUI plante ("Torch not compiled with CUDA enabled").
Start-Process -FilePath $py `
  -ArgumentList 'main.py', '--port', '8189', '--listen', '127.0.0.1', '--cpu' `
  -WorkingDirectory $comfy

# Attente ROBUSTE : on verifie que le PORT 8189 accepte une connexion TCP, plutot
# qu'une requete HTTP (qui echouait avec des resets Windows / IPv6 sur localhost).
Write-Host 'Attente du demarrage de ComfyUI (~1 min au premier lancement)...' -NoNewline
$ready = $false
for ($i = 0; $i -lt 180; $i++) {
  $sock = New-Object System.Net.Sockets.TcpClient
  try {
    $sock.Connect('127.0.0.1', 8189)
    if ($sock.Connected) { $ready = $true; break }
  } catch { }
  finally { $sock.Dispose() }
  Start-Sleep -Seconds 2
  Write-Host '.' -NoNewline
}
Write-Host ''
if ($ready) {
  Write-Host 'ComfyUI est pret.' -ForegroundColor Green
} else {
  Write-Host 'ComfyUI met plus de temps que prevu — on continue quand meme.' -ForegroundColor Yellow
}

Write-Host 'Demarrage du service IA (ai-api)...' -ForegroundColor Green
Start-Process -FilePath $py -ArgumentList 'app.py' `
  -WorkingDirectory (Join-Path $PSScriptRoot 'api')
Start-Sleep -Seconds 3

Write-Host 'Demarrage du worker — une page va s''ouvrir pour confirmer la connexion.' -ForegroundColor Green
Write-Host 'GARDEZ cette fenetre ouverte tant que vous utilisez l''IA.' -ForegroundColor Green
& $py (Join-Path $PSScriptRoot 'worker\app.py')
