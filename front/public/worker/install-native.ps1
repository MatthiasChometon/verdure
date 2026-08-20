# verdure — installeur IA natif ISOLE (sans Docker). Installe SA PROPRE copie de
# ComfyUI dans %USERPROFILE%\verdure-ai : ne touche pas a ton ComfyUI principal.
#
# Usage : ouvrez PowerShell et collez :
#   irm https://verdure-plants.netlify.app/worker/install-native.ps1 | iex
$ErrorActionPreference = 'Stop'
$base = 'https://verdure-plants.netlify.app/worker'
$root = Join-Path $env:USERPROFILE 'verdure-ai'
$comfy = Join-Path $root 'ComfyUI'
$venv = Join-Path $root 'venv'
$vpy = Join-Path $venv 'Scripts\python.exe'

Write-Host ''
Write-Host '  verdure — installation IA isolee (sans Docker, sans toucher ton ComfyUI)' -ForegroundColor Green
Write-Host ''

function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
              [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Ensure-Tool($cmd, $wingetId, $label) {
  if (Get-Command $cmd -ErrorAction SilentlyContinue) { return }
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "  $label est requis et introuvable, et winget non plus." -ForegroundColor Red
    Write-Host "  Installe $label manuellement puis relance." ; exit 1
  }
  Write-Host "  Installation de $label..."
  winget install --silent --accept-source-agreements --accept-package-agreements -e --id $wingetId
  Refresh-Path
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "  $label installe, mais pas encore dans le PATH." -ForegroundColor Yellow
    Write-Host "  Ferme et rouvre PowerShell, puis relance la commande." ; exit 1
  }
}

# 1. Outils : git + Python (installes via winget si absents).
Ensure-Tool git 'Git.Git' 'Git'
Ensure-Tool python 'Python.Python.3.12' 'Python'

# 2. ComfyUI isole.
New-Item -ItemType Directory -Force -Path $root | Out-Null
if (-not (Test-Path (Join-Path $comfy 'main.py'))) {
  Write-Host '  Telechargement de ComfyUI (isole)...'
  git clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git $comfy
}

# 3. Environnement Python dedie + torch CUDA + ComfyUI (recette du Dockerfile).
if (-not (Test-Path $vpy)) {
  Write-Host '  Creation de l''environnement Python dedie...'
  python -m venv $venv
}
& $vpy -m pip install --disable-pip-version-check --upgrade pip
Write-Host '  Installation de torch (CUDA cu124) — gros telechargement, patience...'
& $vpy -m pip install --disable-pip-version-check torch torchvision `
  --index-url https://download.pytorch.org/whl/cu124
& $vpy -m pip install --disable-pip-version-check -r (Join-Path $comfy 'requirements.txt')

# 4. Noeuds d'identification.
$nodes = Join-Path $comfy 'custom_nodes'
New-Item -ItemType Directory -Force -Path $nodes | Out-Null
$qwen = Join-Path $nodes 'ComfyUI-QwenVL'
if (-not (Test-Path $qwen)) {
  git clone --depth 1 https://github.com/1038lab/ComfyUI-QwenVL.git $qwen
}
& $vpy -m pip install --disable-pip-version-check -r (Join-Path $qwen 'requirements.txt')
& $vpy -m pip install --disable-pip-version-check llama-cpp-python `
  --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu124
& $vpy -m pip install --disable-pip-version-check sentence-transformers einops

# 5. Bundle verdure (ai-api + worker + noeud verdure_embed).
$tgz = Join-Path $env:TEMP 'verdure-ai-native.tgz'
Write-Host '  Telechargement des fichiers verdure...'
Invoke-WebRequest -Uri "$base/verdure-ai-native.tgz" -OutFile $tgz
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'
& $tar -xzf $tgz -C $root
Remove-Item $tgz -Force
Copy-Item -Recurse -Force (Join-Path $root 'verdure_embed') (Join-Path $nodes 'verdure_embed')
Remove-Item -Recurse -Force (Join-Path $root 'verdure_embed')

# 6. Comme le Dockerfile : forcer torch cu124 EN DERNIER, puis retirer triton.
Write-Host '  Verrouillage de torch en CUDA cu124...'
& $vpy -m pip install --disable-pip-version-check --no-deps --force-reinstall `
  torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
$site = (& $vpy -c "import sysconfig; print(sysconfig.get_paths()['purelib'])" 2>$null).Trim()
if ($site -and (Test-Path $site)) {
  Get-ChildItem -Path $site -Filter 'triton*' -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

# 7. Chemin du Python dedie, lu par start.ps1.
Set-Content -Path (Join-Path $root 'python.txt') -Value $vpy -Encoding UTF8 -NoNewline

$start = Join-Path $root 'start.ps1'
Write-Host ''
Write-Host '  Installation terminee. Demarrage de l''IA verdure...' -ForegroundColor Green
Write-Host '  Une page va s''ouvrir pour confirmer la connexion. GARDE cette fenetre ouverte.'
Write-Host '  (Les modeles se telechargent a la premiere identification : plusieurs Go, une fois.)'
Write-Host ''
# Turnkey : on enchaine directement sur le lancement (ComfyUI + ai-api + worker).
& $start
