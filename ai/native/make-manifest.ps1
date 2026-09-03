# verdure IA — genere le manifeste incrementiel publie a cote des archives sur
# o2switch (https://verdureee.duckdns.org/dl/). L'installeur (verdure-ai.iss) le
# telecharge en premier et ne recupere que les composants dont l'empreinte SHA-256
# a change depuis la derniere install.
#
# A lancer APRES avoir (re)construit verdure-ai.zip / verdure-parts.zip, dans le
# dossier ou ils sont assembles avant l'upload :
#   .\make-manifest.ps1 -Dir C:\chemin\vers\dl -Version 1.6
#
# Puis uploader dl\manifest.json EN MEME TEMPS que les archives changees. Le
# manifeste doit toujours refleter les archives reellement en ligne.
param(
  [string]$Dir = $PSScriptRoot,
  [string]$Version = '1.5'
)
$ErrorActionPreference = 'Stop'

# Les composants du bundle Inno. `strip` reprend l'extraction historique :
#   runtime = archive prefixee d'un dossier (--strip-components=1) ;
#   parts   = chemins deja relatifs a {app} (aucun strip).
$components = @(
  @{ id = 'runtime'; file = 'verdure-ai.zip';    strip = 1 },
  @{ id = 'parts';   file = 'verdure-parts.zip'; strip = 0 }
)

$entries = New-Object System.Collections.Generic.List[string]
foreach ($c in $components) {
  $path = Join-Path $Dir $c.file
  if (-not (Test-Path $path)) {
    Write-Warning "Absent, ignore : $($c.file) (le composant '$($c.id)' ne sera pas dans le manifeste)"
    continue
  }
  $hash = (Get-FileHash $path -Algorithm SHA256).Hash.ToLower()
  $size = (Get-Item $path).Length
  $entries.Add(('{{"id":"{0}","file":"{1}","sha256":"{2}","size":{3},"strip":{4}}}' -f `
    $c.id, $c.file, $hash, $size, $c.strip))
  Write-Host ("  {0,-8} {1}  {2} octets" -f $c.id, $hash, $size)
}
if ($entries.Count -eq 0) { throw "Aucune archive trouvee dans '$Dir'. Rien a publier." }

# Un objet par ligne : JSON valide ET lisible ligne a ligne par le parseur Pascal
# de l'installeur.
$json = '{"version":"' + $Version + '","components":[' + "`n" +
  ($entries -join ",`n") + "`n" + ']}'
$out = Join-Path $Dir 'manifest.json'
Set-Content -Path $out -Value $json -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "manifest.json ecrit dans $out (version $Version)."
Write-Host "Uploade-le sur o2switch dans dl/ AVEC les archives modifiees."
