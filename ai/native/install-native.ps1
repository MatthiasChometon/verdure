# verdure — installeur IA natif AUTONOME (sans Docker). Telecharge un Python
# portable + ComfyUI + les 2 modeles verdure dans %USERPROFILE%\verdure-ai.
# Aucun prerequis a part une carte NVIDIA : ni git, ni winget, ni Python systeme.
$ErrorActionPreference = 'Stop'

$base = 'https://verdure-plants.netlify.app/worker'
$pyUrl = 'https://github.com/astral-sh/python-build-standalone/releases/download/20250115/cpython-3.12.8+20250115-x86_64-pc-windows-msvc-install_only.tar.gz'
# ComfyUI EPINGLE sur v0.30.0 : les versions plus recentes tirent comfy-kitchen
# 0.2.31 qui exige torch >= 2.7 (indispo en cu124) et fait planter le demarrage.
# v0.30.0 epingle comfy-kitchen 0.2.26, compatible torch 2.6 cu124 (= l'ere Docker).
$comfyUrl = 'https://codeload.github.com/comfyanonymous/ComfyUI/tar.gz/refs/tags/v0.30.0'
$qwenUrl = 'https://codeload.github.com/1038lab/ComfyUI-QwenVL/tar.gz/refs/heads/main'
$torchIndex = 'https://download.pytorch.org/whl/cu124'

$root = Join-Path $env:USERPROFILE 'verdure-ai'
$comfy = Join-Path $root 'ComfyUI'
$nodes = Join-Path $comfy 'custom_nodes'
$vpy = Join-Path $root 'python\python.exe'
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'

function Fetch-Targz($url, $extractTo) {
  $tmp = Join-Path $env:TEMP ('verdure_dl_' + [IO.Path]::GetRandomFileName() + '.tgz')
  Invoke-WebRequest -Uri $url -OutFile $tmp
  New-Item -ItemType Directory -Force -Path $extractTo | Out-Null
  & $tar -xzf $tmp -C $extractTo
  Remove-Item $tmp -Force
}
function Pip { & $vpy -m pip install --disable-pip-version-check @args }

try {
  Write-Host ''
  Write-Host '  verdure — installation IA autonome (sans Docker)' -ForegroundColor Green
  Write-Host ''
  New-Item -ItemType Directory -Force -Path $root | Out-Null

  # 1. Python portable (autonome, dans le dossier — rien a installer sur le PC).
  if (-not (Test-Path $vpy)) {
    Write-Host '  Telechargement de Python (portable)...'
    Fetch-Targz $pyUrl $root      # -> python\python.exe
  }
  if (-not (Test-Path $vpy)) { throw 'Python portable non extrait (structure inattendue).' }

  # 2. ComfyUI (archive, pas de git).
  if (-not (Test-Path (Join-Path $comfy 'main.py'))) {
    Write-Host '  Telechargement de ComfyUI...'
    Fetch-Targz $comfyUrl $root   # -> ComfyUI-0.30.0\
    $extracted = Get-ChildItem $root -Directory -Filter 'ComfyUI-*' | Select-Object -First 1
    if ($extracted) { Move-Item $extracted.FullName $comfy }
  }

  # 3. torch CUDA + ComfyUI (recette du Dockerfile).
  Pip --upgrade pip
  Write-Host '  Installation de torch (CUDA cu124) — gros telechargement, patience...'
  Pip torch torchvision --index-url $torchIndex
  Pip -r (Join-Path $comfy 'requirements.txt')

  # 4. Noeud d'identification QwenVL (archive) + ses dependances.
  New-Item -ItemType Directory -Force -Path $nodes | Out-Null
  $qwen = Join-Path $nodes 'ComfyUI-QwenVL'
  if (-not (Test-Path $qwen)) {
    Fetch-Targz $qwenUrl $nodes   # -> ComfyUI-QwenVL-main\
    $extracted = Join-Path $nodes 'ComfyUI-QwenVL-main'
    if (Test-Path $extracted) { Move-Item $extracted $qwen }
  }
  Pip -r (Join-Path $qwen 'requirements.txt')
  # llama-cpp-python : wheel JamePeng cu124 (AVX2). Le wheel abetlen officiel est
  # compile en AVX512 et crashe (0xc000001d, illegal instruction) sur les CPU sans
  # AVX512 (Intel Alder Lake+ grand public, beaucoup de Ryzen). Celui-ci tourne
  # largement et supporte Qwen3-VL. Verifie sur un i7-12700H.
  Pip 'https://github.com/JamePeng/llama-cpp-python/releases/download/v0.3.47-cu124-win-20260815/llama_cpp_python-0.3.47%2Bcu124-cp312-cp312-win_amd64.whl'
  Pip sentence-transformers einops

  # 5. Bundle verdure (ai-api + worker + noeud verdure_embed + start.ps1).
  Write-Host '  Telechargement des fichiers verdure...'
  Fetch-Targz "$base/verdure-ai-native.tgz" $root
  Copy-Item -Recurse -Force (Join-Path $root 'verdure_embed') (Join-Path $nodes 'verdure_embed')
  Remove-Item -Recurse -Force (Join-Path $root 'verdure_embed')

  # 6. Comme le Dockerfile : forcer torch cu124 EN DERNIER, puis retirer triton.
  Write-Host '  Verrouillage de torch en CUDA cu124...'
  Pip --no-deps --force-reinstall torch torchvision torchaudio --index-url $torchIndex
  $site = (& $vpy -c "import sysconfig; print(sysconfig.get_paths()['purelib'])" 2>$null).Trim()
  if ($site -and (Test-Path $site)) {
    Get-ChildItem -Path $site -Filter 'triton*' -ErrorAction SilentlyContinue |
      Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  }

  # 7. Chemin du Python portable (lu par start.ps1) + lancement.
  Set-Content -Path (Join-Path $root 'python.txt') -Value $vpy -Encoding UTF8 -NoNewline
  Write-Host ''
  Write-Host '  Installation terminee. Demarrage de l''IA verdure...' -ForegroundColor Green
  Write-Host '  Une page va s''ouvrir pour confirmer la connexion. GARDE cette fenetre ouverte.'
  Write-Host '  (Les modeles se telechargent a la premiere identification : plusieurs Go, une fois.)'
  Write-Host ''
  & (Join-Path $root 'start.ps1')
}
catch {
  Write-Host ''
  Write-Host "  ERREUR : $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "  $($_.InvocationInfo.PositionMessage)" -ForegroundColor DarkGray
  Write-Host ''
  Read-Host '  Copie ce message et envoie-le. Appuie sur Entree pour fermer'
  exit 1
}
