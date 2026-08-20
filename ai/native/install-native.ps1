# verdure — installeur IA natif, leger, sans Docker.
# Se branche sur TON ComfyUI existant : ajoute les 2 noeuds d'identification, puis
# installe l'ai-api + le worker (Python pur). Les modeles se telechargent au 1er usage.
#
# Usage : ouvrez PowerShell et collez :
#   irm https://verdure-plants.netlify.app/worker/install-native.ps1 | iex
# (Optionnel : $env:VERDURE_COMFYUI_DIR = 'C:\chemin\ComfyUI' avant, pour forcer.)
$ErrorActionPreference = 'Stop'
$base = 'https://verdure-plants.netlify.app/worker'

Write-Host ''
Write-Host '  verdure — installation de l''IA (legere, sans Docker)' -ForegroundColor Green
Write-Host ''

# --- 1. Localiser ComfyUI (dossier contenant main.py) ---
$comfy = $env:VERDURE_COMFYUI_DIR
if (-not $comfy) {
  $comfy = @(
    "$env:USERPROFILE\ComfyUI",
    "$env:USERPROFILE\ComfyUI_windows_portable\ComfyUI",
    "$env:USERPROFILE\Documents\ComfyUI",
    "$env:USERPROFILE\Desktop\ComfyUI_windows_portable\ComfyUI",
    'C:\ComfyUI',
    'C:\ComfyUI_windows_portable\ComfyUI'
  ) | Where-Object { Test-Path (Join-Path $_ 'main.py') } | Select-Object -First 1
}
if (-not $comfy) {
  $comfy = Read-Host '  Chemin de ton dossier ComfyUI (celui qui contient main.py)'
}
if (-not (Test-Path (Join-Path $comfy 'main.py'))) {
  Write-Host "  ComfyUI introuvable a : $comfy" -ForegroundColor Red
  Write-Host '  Relancez en pointant le bon dossier (celui qui contient main.py).'
  return
}
$comfy = (Resolve-Path $comfy).Path
Write-Host "  ComfyUI : $comfy"

# --- 2. Trouver le Python de ComfyUI ---
$py = @(
  (Join-Path (Split-Path $comfy -Parent) 'python_embeded\python.exe'),
  (Join-Path $comfy 'python_embeded\python.exe'),
  (Join-Path $comfy 'venv\Scripts\python.exe'),
  (Join-Path $comfy '.venv\Scripts\python.exe')
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $py) { $py = (Get-Command python -ErrorAction SilentlyContinue).Source }
if (-not $py) {
  Write-Host '  Python de ComfyUI introuvable.' -ForegroundColor Red
  return
}
Write-Host "  Python  : $py"
Write-Host ''

# --- 3. Noeuds d'identification dans ComfyUI/custom_nodes ---
$nodes = Join-Path $comfy 'custom_nodes'
New-Item -ItemType Directory -Force -Path $nodes | Out-Null
$qwen = Join-Path $nodes 'ComfyUI-QwenVL'

if (-not (Test-Path $qwen)) {
  Write-Host '  Installation du noeud vision (QwenVL)...'
  if (Get-Command git -ErrorAction SilentlyContinue) {
    git clone --depth 1 https://github.com/1038lab/ComfyUI-QwenVL.git $qwen
  } else {
    # Pas de git : recuperer le zip GitHub et l'extraire avec tar (integre a Windows).
    $zip = Join-Path $env:TEMP 'qwenvl.zip'
    Invoke-WebRequest -Uri 'https://codeload.github.com/1038lab/ComfyUI-QwenVL/zip/refs/heads/main' -OutFile $zip
    $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
    & $tar -xf $zip -C $nodes
    Move-Item (Join-Path $nodes 'ComfyUI-QwenVL-main') $qwen
    Remove-Item $zip -Force
  }
}

Write-Host '  Installation des dependances (peut prendre quelques minutes)...'
& $py -m pip install --disable-pip-version-check -r (Join-Path $qwen 'requirements.txt')
& $py -m pip install --disable-pip-version-check llama-cpp-python `
  --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu124
& $py -m pip install --disable-pip-version-check sentence-transformers einops

# --- 4. Bundle verdure (ai-api + worker + noeud verdure_embed) ---
$dir = Join-Path $env:USERPROFILE 'verdure-ai'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$tgz = Join-Path $env:TEMP 'verdure-ai-native.tgz'
Write-Host '  Telechargement des fichiers verdure...'
Invoke-WebRequest -Uri "$base/verdure-ai-native.tgz" -OutFile $tgz
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'
& $tar -xzf $tgz -C $dir
Remove-Item $tgz -Force

# Le noeud verdure_embed va dans ComfyUI ; on garde api/ + worker/ dans verdure-ai.
Copy-Item -Recurse -Force (Join-Path $dir 'verdure_embed') (Join-Path $nodes 'verdure_embed')
Remove-Item -Recurse -Force (Join-Path $dir 'verdure_embed')

# Chemin du Python, lu par start.ps1.
Set-Content -Path (Join-Path $dir 'python.txt') -Value $py -Encoding UTF8 -NoNewline

# --- 5. Fin ---
$start = Join-Path $dir 'start.ps1'
Write-Host ''
Write-Host '  Installation terminee.' -ForegroundColor Green
Write-Host ''
Write-Host '  1) REDEMARRE ComfyUI (pour charger les nouveaux modules).'
Write-Host '  2) Lance l''IA verdure :'
Write-Host "       powershell -ExecutionPolicy Bypass -File `"$start`"" -ForegroundColor Cyan
Write-Host "     (ou clic droit sur $start -> Executer avec PowerShell)"
Write-Host ''
Write-Host '  Au 1er lancement, une page s''ouvre pour confirmer la connexion, puis'
Write-Host '  les modeles se telechargent a la premiere identification (plusieurs Go).'
