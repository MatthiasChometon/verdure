# verdure — installeur IA natif AUTONOME (sans Docker). Telecharge un Python
# portable + ComfyUI + les 2 modeles verdure dans %USERPROFILE%\verdure-ai.
# Aucun prerequis a part une carte NVIDIA : ni git, ni winget, ni Python systeme.
$ErrorActionPreference = 'Stop'

$base = 'https://verdure.mtxlab.xyz/worker'
$pyUrl = 'https://github.com/astral-sh/python-build-standalone/releases/download/20250115/cpython-3.12.8+20250115-x86_64-pc-windows-msvc-install_only.tar.gz'
# ComfyUI EPINGLE sur v0.30.0 : les versions plus recentes tirent comfy-kitchen
# 0.2.31 qui exige torch >= 2.7 (indispo en cu124) et fait planter le demarrage.
# v0.30.0 epingle comfy-kitchen 0.2.26, compatible torch 2.6 (= l'ere Docker).
$comfyUrl = 'https://codeload.github.com/comfyanonymous/ComfyUI/tar.gz/refs/tags/v0.30.0'
$qwenUrl = 'https://codeload.github.com/1038lab/ComfyUI-QwenVL/tar.gz/refs/heads/main'

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

  # 3. torch CPU (~1 Go au lieu de ~7 Go en CUDA) + ComfyUI. L'identification tourne
  #    sur le GPU via llama-cpp (son propre CUDA), pas via torch — donc torch CPU
  #    suffit, et l'embedding (nomic, petit) tourne tres bien sur CPU. torch 2.6
  #    pour rester compatible comfy-kitchen 0.2.26 (ComfyUI v0.30.0).
  Pip --upgrade pip
  Write-Host '  Installation de torch (CPU, leger)...'
  Pip torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0
  Pip -r (Join-Path $comfy 'requirements.txt')

  # 4. Noeud d'identification QwenVL (archive) + ses dependances.
  New-Item -ItemType Directory -Force -Path $nodes | Out-Null
  $qwen = Join-Path $nodes 'ComfyUI-QwenVL'
  if (-not (Test-Path $qwen)) {
    Fetch-Targz $qwenUrl $nodes   # -> ComfyUI-QwenVL-main\
    $extracted = Join-Path $nodes 'ComfyUI-QwenVL-main'
    if (Test-Path $extracted) { Move-Item $extracted $qwen }
  }
  # mmproj Q8 au lieu du F16 par defaut : 2x plus petit (~370 Mo de moins),
  # qualite d'identification quasi identique (verifie).
  $cfg = Join-Path $qwen 'gguf_models.json'
  (Get-Content $cfg -Raw).Replace('mmproj-Qwen3VL-4B-Instruct-F16.gguf', 'mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf') |
    Set-Content $cfg -NoNewline
  Pip -r (Join-Path $qwen 'requirements.txt')
  # Identification sur GPU : le node QwenVL choisit son device via
  # torch.cuda.is_available(), or torch est ici la version CPU -> il ferait tourner
  # llama_cpp sur le CPU (~30 s/scan). llama_cpp a son PROPRE CUDA et voit le GPU :
  # on force l'offload quand il est dispo. ~30 s -> ~2-3 s, et bien plus precis.
  $qvg = Join-Path $qwen 'AILab_QwenVL_GGUF.py'
  $qsrc = [IO.File]::ReadAllText($qvg)
  if ($qsrc -notmatch 'llama_supports_gpu_offload') {
    $qpatch = "            n_gpu_layers = 0`n            try:`n                from llama_cpp import llama_cpp as _vlb`n                if _vlb.llama_supports_gpu_offload():`n                    n_gpu_layers = -1`n            except Exception:`n                pass"
    $qsrc = $qsrc.Replace("            n_gpu_layers = 0", $qpatch)
    [IO.File]::WriteAllText($qvg, $qsrc, (New-Object Text.UTF8Encoding($false)))
  }
  # llama-cpp-python : wheel JamePeng cu124 (AVX2). Le wheel abetlen officiel est
  # compile en AVX512 et crashe (0xc000001d, illegal instruction) sur les CPU sans
  # AVX512 (Intel Alder Lake+ grand public, beaucoup de Ryzen). Celui-ci tourne
  # largement et supporte Qwen3-VL. Verifie sur un i7-12700H.
  Pip 'https://github.com/JamePeng/llama-cpp-python/releases/download/v0.3.47-cu124-win-20260815/llama_cpp_python-0.3.47%2Bcu124-cp312-cp312-win_amd64.whl'
  # einops (petit, requis par nomic) + sentence-transformers : le worker embed
  # aussi (nomic, /embed) les requetes de recherche et les plantes via la file,
  # pas seulement l'identification. torch (CPU, deja installe) suffit a nomic.
  Pip einops sentence-transformers

  # 5. Bundle verdure (ai-api + worker + noeud verdure_embed + start.ps1).
  Write-Host '  Telechargement des fichiers verdure...'
  Fetch-Targz "$base/verdure-ai-native.tgz" $root
  # Poser le noeud verdure_embed (embedding nomic) dans ComfyUI, indispensable a
  # /embed (recherche semantique + embeddings de plantes via la file du worker).
  $embedSrc = Join-Path $root 'verdure_embed'
  $embedDst = Join-Path $nodes 'verdure_embed'
  if (Test-Path $embedSrc) {
    if (Test-Path $embedDst) { Remove-Item -Recurse -Force $embedDst }
    Move-Item $embedSrc $embedDst
  }

  # 6. DLL CUDA pour llama-cpp : le wheel a besoin de cudart/cublas/nvrtc. On les
  #    recupere via les paquets nvidia-*-cu12, on les COPIE a cote de llama.dll,
  #    puis on desinstalle les paquets (evite ~900 Mo de doublon). On enleve aussi
  #    les assets d'exemple de ComfyUI (inutiles ici) pour alleger.
  Write-Host '  Mise en place des DLL CUDA (GPU) + nettoyage...'
  Pip nvidia-cuda-runtime-cu12 nvidia-cublas-cu12
  $site = (& $vpy -c "import sysconfig; print(sysconfig.get_paths()['purelib'])").Trim()
  $lib = Join-Path $site 'llama_cpp\lib'
  Get-ChildItem (Join-Path $site 'nvidia') -Recurse -Filter '*.dll' -EA SilentlyContinue |
    Copy-Item -Destination $lib -Force
  Remove-Item (Join-Path $lib 'nvblas64_12.dll'), (Join-Path $lib 'nvrtc64_120_0.alt.dll') -EA SilentlyContinue
  & $vpy -m pip uninstall -y nvidia-cublas-cu12 nvidia-cuda-runtime-cu12 nvidia-cuda-nvrtc-cu12 *> $null
  & $vpy -m pip uninstall -y comfyui-workflow-templates-media-video comfyui-workflow-templates-media-api comfyui-workflow-templates-media-other comfyui-workflow-templates-media-image comfyui-workflow-templates-media-assets-01 *> $null
  # Poids mort : les .lib de torch (servent a compiler, pas a executer) et le
  # doublon llama_cpp\bin (copie de lib\, jamais chargee) -> ~1,5 Go de moins.
  Remove-Item (Join-Path $site 'torch\lib\*.lib') -Force -EA SilentlyContinue
  Remove-Item (Join-Path $site 'llama_cpp\bin') -Recurse -Force -EA SilentlyContinue

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
