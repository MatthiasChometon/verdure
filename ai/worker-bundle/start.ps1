# verdure worker — double-click "Run with PowerShell", or run this in a terminal.
# Builds and starts ComfyUI + api + worker; a page opens for you to confirm the
# connection on first launch. Keep this window open while you use the AI.
Set-Location -Path $PSScriptRoot
docker compose up
